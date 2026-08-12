"use server"

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(formData: FormData) {
  const rememberMe = formData.get("rememberMe") === "on";
  
  try {
    await signIn("credentials", formData);
  } catch (error) {
    // NextAuth throws a redirect on successful sign in
    if (isRedirectError(error)) {
      if (!rememberMe) {
        // Safe fallback for Auth.js static maxAge: 
        // Strip the Expires/Max-Age directive after authentication to make it a browser-session cookie.
        const cookieStore = await cookies();
        const cookieName = process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";
        const sessionCookie = cookieStore.get(cookieName);
        if (sessionCookie) {
          cookieStore.set(cookieName, sessionCookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
          });
        }
      }
      throw error;
    }
    
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
