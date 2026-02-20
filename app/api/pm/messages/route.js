import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Message from '@/models/Message';
import { getSession } from '@/lib/auth';
import { requireRole, getNormalizedRole } from '@/lib/rbac';
import { ROLES } from '@/constants/roles';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/pm/messages - Get PM's messages (sent and received)
 */
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.VENDOR, ROLES.FINANCE_USER])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const invoiceId = searchParams.get('invoiceId');
        const type = searchParams.get('type') || 'all'; // 'inbox', 'sent', 'all'

        let query = {};

        if (type === 'inbox') {
            query.recipientId = session.user.id;
        } else if (type === 'sent') {
            query.senderId = session.user.id;
        } else {
            query = {
                $or: [
                    { senderId: session.user.id },
                    { recipientId: session.user.id }
                ]
            };
        }

        if (invoiceId) query.invoiceId = invoiceId;

        const messages = await Message.find(query).sort({ created_at: -1 });

        // Count unread
        const unreadCount = await Message.countDocuments({
            recipientId: session.user.id,
            isRead: false
        });

        return NextResponse.json({
            messages: messages.map(m => m.toObject()),
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

/**
 * POST /api/pm/messages - Send a message to vendor
 */
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.PROJECT_MANAGER, ROLES.VENDOR, ROLES.ADMIN, ROLES.FINANCE_USER])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        await connectToDatabase();

        const body = await request.json();
        const { recipientId, invoiceId, projectId, subject, content, messageType, parentMessageId } = body;

        if (!recipientId || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: recipientId, content' },
                { status: 400 }
            );
        }

        // Get recipient details
        const recipient = await db.getUserById(recipientId);
        if (!recipient) {
            return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
        }

        // Security Check - Role-based messaging (cross-role only)
        // Security Check - Role-based messaging flow enforcement
        const userRole = getNormalizedRole(session.user);
        const recipientRole = getNormalizedRole(recipient);

        // 1. Block same-role messaging
        if (userRole === recipientRole) {
            return NextResponse.json({
                error: 'Cannot send messages to users of the same role. Cross-role messaging only.'
            }, { status: 403 });
        }

        // 2. Enforce allowed communication paths
        let flowAllowed = false;

        // Paths involving PM (Central hub)
        if (userRole === ROLES.PROJECT_MANAGER) {
            // PM can message Vendors and Finance Users
            if ([ROLES.VENDOR, ROLES.FINANCE_USER].includes(recipientRole)) flowAllowed = true;
        } else if (recipientRole === ROLES.PROJECT_MANAGER) {
            // Vendors and Finance Users can message PMs
            if ([ROLES.VENDOR, ROLES.FINANCE_USER].includes(userRole)) flowAllowed = true;
        }

        // Admin paths (Can message anyone)
        if (userRole === ROLES.ADMIN) flowAllowed = true;

        if (!flowAllowed) {
            return NextResponse.json({
                error: `Communication not allowed between ${userRole} and ${recipientRole}. Only PM <-> Vendor and PM <-> Finance User flows are permitted.`
            }, { status: 403 });
        }

        // Create message
        const messageId = uuidv4();
        const threadId = parentMessageId
            ? (await Message.findOne({ id: parentMessageId }))?.threadId || parentMessageId
            : messageId;

        const message = await Message.create({
            id: messageId,
            invoiceId: invoiceId || null,
            projectId: projectId || null,
            senderId: session.user.id,
            senderName: session.user.name || session.user.email,
            senderRole: getNormalizedRole(session.user),
            recipientId,
            recipientName: recipient.name,
            subject: subject || null,
            content,
            messageType: messageType || 'GENERAL',
            parentMessageId: parentMessageId || null,
            threadId
        });

        // Audit trail
        await db.createAuditTrailEntry({
            invoice_id: invoiceId || null,
            username: session.user.name || session.user.email,
            action: 'MESSAGE_SENT',
            details: `Message sent to ${recipient.name}: ${subject || '(no subject)'}`
        });

        return NextResponse.json({
            success: true,
            message: message.toObject()
        }, { status: 201 });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

/**
 * PATCH /api/pm/messages - Mark messages as read
 */
export async function PATCH(request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await connectToDatabase();

        const body = await request.json();
        const { messageIds } = body;

        if (!messageIds || !Array.isArray(messageIds)) {
            return NextResponse.json({ error: 'messageIds array required' }, { status: 400 });
        }

        await Message.updateMany(
            {
                id: { $in: messageIds },
                recipientId: session.user.id
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
    }
}
