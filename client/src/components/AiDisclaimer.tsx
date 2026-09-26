import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AI_REVIEW_DISCLAIMER,
  AI_REVIEW_DISCLAIMER_DETAIL,
} from "@shared/const";
import { TriangleAlert } from "lucide-react";

/** Shown above any AI-generated analysis; same wording as generated reports. */
export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <Alert
      role="note"
      className={`border-primary/40 bg-primary/5 ${className ?? ""}`}
    >
      <TriangleAlert className="text-primary" />
      <AlertTitle className="text-primary">{AI_REVIEW_DISCLAIMER}</AlertTitle>
      <AlertDescription className="text-xs">
        {AI_REVIEW_DISCLAIMER_DETAIL}
      </AlertDescription>
    </Alert>
  );
}
