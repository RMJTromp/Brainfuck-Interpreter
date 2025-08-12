import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./highlighting.css";
import "./JetBrains-Mono.css";
import {ThemeProvider} from "next-themes";
import {Toaster} from "@/components/ui/sonner";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Brainfuck Interpreter, Debugger & Learning Hub",
    description: "Learn Brainfuck with an interactive interpreter, step-by-step debugger, cheatsheets, examples, tutorials, and more.",
    applicationName: "Brainfuck",
    authors: [
        {
            url: "https://rmjtromp.com",
            name: "RMJTromp",
        }
    ],
    openGraph: {
        title: "Brainfuck Interpreter, Debugger & Learning Hub",
        description: "Learn Brainfuck with an interactive interpreter, step-by-step debugger, cheatsheets, examples, tutorials, and more.",
        url: "https://brainfuck.rmjtromp.com",
        siteName: "Brainfuck",
        type: "website"
    }
};

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    <div className={"max-w-[1500px] w-full mx-auto grid grid-flow-col grid-cols-[1fr_auto] gap-12"}>
                        {children}
                        <aside className={"mt-[60px]"}>
                            <p className={"text-muted-foreground bg-background sticky top-0 h-6 text-xs"}>Learn Brainfuck</p>
                            <ul>
                                <li><a href=""></a></li>
                            </ul>
                            <p className={"text-muted-foreground bg-background sticky top-0 h-6 text-xs"}>Snippets</p>
                            <p className={"text-muted-foreground bg-background sticky top-0 h-6 text-xs"}>Resources</p>
                        </aside>
                    </div>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
