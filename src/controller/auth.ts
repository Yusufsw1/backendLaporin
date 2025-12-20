import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { supabase } from "../supabase/client";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function googleVerify(req: Request, res: Response) {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ error: "Token invalid" });

    const { email, name, picture } = payload;

    const { data: existingUser, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();

    if (error) throw error;

    let user = existingUser;

    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            email,
            name,
            avatar_url: picture,
            google_id: payload.sub,
            role: "user",
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    const jwtToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login berhasil",
      token: jwtToken,
      user,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Server error",
    });
  }
}
