import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../../lib/prisma";

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/customer",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account && user.email) {
        try {
          const email = user.email.toLowerCase();
          const existingCustomer = await prisma.customer.findFirst({
            where: { email },
          });

          if (existingCustomer) {
            if (account.provider === "google" && !existingCustomer.googleId) {
              await prisma.customer.update({
                where: { id: existingCustomer.id },
                data: { googleId: account.providerAccountId },
              });
            }
            if (account.provider === "github" && !existingCustomer.githubId) {
              await prisma.customer.update({
                where: { id: existingCustomer.id },
                data: { githubId: account.providerAccountId },
              });
            }
            if (!existingCustomer.emailVerified) {
              await prisma.customer.update({
                where: { id: existingCustomer.id },
                data: { emailVerified: new Date() },
              });
            }
            if (!existingCustomer.image && user.image) {
              await prisma.customer.update({
                where: { id: existingCustomer.id },
                data: { image: user.image },
              });
            }
          } else {
            let phone = "";
            let address = "";
            try {
              const config = await prisma.settings.findFirst({});
              if (config?.storePhone) {
                phone = config.storePhone;
              }
            } catch {}

            await prisma.customer.create({
              data: {
                name: user.name || email.split("@")[0] || "User",
                email,
                emailVerified: new Date(),
                image: user.image || null,
                phone,
                address,
                googleId: account.provider === "google" ? account.providerAccountId : null,
                githubId: account.provider === "github" ? account.providerAccountId : null,
              },
            });
          }
        } catch (err) {
          console.error("Error syncing customer during signIn:", err);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        const email = token.email?.toLowerCase();
        if (email) {
          try {
            const customer = await prisma.customer.findFirst({ where: { email } });
            if (customer) {
              token.sub = String(customer.id);
              token.id = customer.id;
            }
          } catch (err) {
            console.error("Error looking up customer in jwt callback:", err);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        (session.user as any).id = token.id as number | undefined || token.sub;
      }
      return session;
    },
  },
  events: {
    createUser: async ({ user }) => {
      if (user.email) {
        const email = user.email.toLowerCase();
        try {
          const customer = await prisma.customer.findFirst({
            where: { email },
          });
          if (!customer) {
            let phone = "";
            let address = "";
            try {
              const config = await prisma.settings.findFirst({});
              if (config?.storePhone) {
                phone = config.storePhone;
              }
            } catch {}

            await prisma.customer.create({
              data: {
                name: user.name || email.split("@")[0] || "User",
                email,
                emailVerified: new Date(),
                image: user.image || null,
                phone,
                address,
              },
            });
          }
        } catch (err) {
          console.error("Error in createUser event:", err);
        }
      }
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
