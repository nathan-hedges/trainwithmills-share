import { prisma } from "@/lib/prisma";

type NotificationType = "message" | "reminder" | "summary" | "milestone" | "alert" | "form"

export async function createNotification(userId: string, type: NotificationType, title: string, link?: string) {
    try {
        const notificaiton = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                link: link || null
            }
        });
        return notificaiton;
    } catch {
        console.log("Failed to create database notification")
    }
}