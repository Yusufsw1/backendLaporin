"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleVerify = googleVerify;
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../supabase/client");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
function googleVerify(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { token } = req.body;
            const ticket = yield client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload)
                return res.status(400).json({ error: "Token invalid" });
            const { email, name, picture } = payload;
            const { data: existingUser, error } = yield client_1.supabase.from("users").select("*").eq("email", email).maybeSingle();
            if (error)
                throw error;
            let user = existingUser;
            if (!existingUser) {
                const { data: newUser, error: insertError } = yield client_1.supabase
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
                if (insertError)
                    throw insertError;
                user = newUser;
            }
            const jwtToken = jsonwebtoken_1.default.sign({
                id: user.id,
                role: user.role,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
            }, process.env.JWT_SECRET, { expiresIn: "1d" });
            return res.json({
                message: "Login berhasil",
                token: jwtToken,
                user,
            });
        }
        catch (error) {
            return res.status(500).json({
                error: error.message || "Server error",
            });
        }
    });
}
