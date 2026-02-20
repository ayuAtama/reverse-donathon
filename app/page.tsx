import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Donation Countdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a view
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild variant="default" className="w-full">
            <Link href="/countdown">Countdown Timer</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/overlay">OBS Overlay</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin">Admin Panel</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
