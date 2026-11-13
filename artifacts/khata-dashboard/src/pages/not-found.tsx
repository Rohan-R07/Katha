import { Link } from "wouter";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/khata-ui";

export default function NotFound() {
  return (
    <EmptyState icon={<FileQuestion className="h-5 w-5" />} title="This page isn't in the khata" body="The address may be mistyped, or the page has moved.">
      <Link href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-home">Back to overview</Link>
    </EmptyState>
  );
}
