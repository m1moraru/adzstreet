import pool from "../config/db.js";

export async function startConversation(req, res) {

  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const buyerId = req.user.id;
    const { adId, message } = req.body;

    if (!adId || !message?.trim()) {
      return res.status(400).json({ message: "Ad ID and message are required" });
    }

    const adResult = await pool.query(
      `SELECT id, user_id AS seller_id, title FROM ads WHERE public_id = $1`,
      [Number(adId)]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({ message: "Ad not found" });
    }

    const ad = adResult.rows[0];

    if (ad.seller_id === buyerId) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    const conversationResult = await pool.query(
      `
      INSERT INTO conversations (ad_id, buyer_id, seller_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (ad_id, buyer_id, seller_id)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [ad.id, buyerId, ad.seller_id]
    );

    const conversation = conversationResult.rows[0];

    const messageResult = await pool.query(
      `
      INSERT INTO messages (conversation_id, sender_id, body)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [conversation.id, buyerId, message.trim()]
    );

    res.status(201).json({
      conversation,
      message: messageResult.rows[0],
    });
  } catch (err) {
    console.error("Start conversation error:", err);

    return res.status(500).json({
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
    });
  }
}

export async function getMyConversations(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        c.*,
        a.title AS ad_title,
        a.public_id AS ad_public_id,
        buyer.full_name AS buyer_name,
        seller.full_name AS seller_name,
        latest.body AS latest_message,
        latest.created_at AS latest_message_at
      FROM conversations c
      JOIN ads a ON a.id = c.ad_id
      JOIN users buyer ON buyer.id = c.buyer_id
      JOIN users seller ON seller.id = c.seller_id
      LEFT JOIN LATERAL (
        SELECT body, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON true
      WHERE c.buyer_id = $1 OR c.seller_id = $1
      ORDER BY latest.created_at DESC NULLS LAST
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getConversationMessages(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const access = await pool.query(
      `
      SELECT *
      FROM conversations
      WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)
      `,
      [conversationId, userId]
    );

    if (access.rows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    await pool.query(
      `
      UPDATE messages
      SET is_read = true
      WHERE conversation_id = $1 AND sender_id != $2
      `,
      [conversationId, userId]
    );

    const result = await pool.query(
        `
        SELECT 
            m.*,
            u.full_name AS sender_name,
            $2::uuid AS current_user_id
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
        `,
        [conversationId, userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const access = await pool.query(
      `
      SELECT *
      FROM conversations
      WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)
      `,
      [conversationId, userId]
    );

    if (access.rows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    const conversation = access.rows[0];

    const recipientId =
      conversation.buyer_id === userId
        ? conversation.seller_id
        : conversation.buyer_id;

    const result = await pool.query(
      `
      INSERT INTO messages (conversation_id, sender_id, body)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [conversationId, userId, message.trim()]
    );

    await pool.query(
      `
      UPDATE conversations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [conversationId]
    );

    await pool.query(
      `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        link
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        recipientId,
        "message",
        "New message",
        message.trim().slice(0, 120),
        `/messages/${conversationId}`,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Server error" });
  }
}