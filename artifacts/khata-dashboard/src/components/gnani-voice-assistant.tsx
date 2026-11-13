import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Volume2, Check, X, AlertCircle, Sparkles, Loader2, RefreshCw, UserCheck, UserPlus, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock } from "lucide-react";
import { useProcessVoice, useGetMe, type Customer, type AuthSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateLedger, formatINR } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AssistantState =
  | "idle"
  | "listening"
  | "processing"
  | "transcribing"
  | "understanding"
  | "checking_customer"
  | "creating_customer"
  | "recording_ledger"
  | "awaiting_confirmation"
  | "executing"
  | "completed"
  | "error";

export type ProcessingStepKey =
  | "listen"
  | "transcribe"
  | "understand"
  | "customer"
  | "ledger"
  | "done";

interface ProcessingStep {
  key: ProcessingStepKey;
  labelEn: string;
  labelKn: string;
  labelHi: string;
  status: "pending" | "active" | "completed" | "error";
  detail?: string;
}

interface LastResultDetails {
  customerName: string;
  isNewCustomer: boolean;
  transactionType: "credit" | "payment" | "inquiry";
  amount?: string;
  balance?: string;
  message: string;
}

interface GnaniVoiceAssistantProps {
  session?: AuthSession;
  className?: string;
  defaultLanguage?: "kn" | "hi" | "en";
}

export function GnaniVoiceAssistant({ session, className, defaultLanguage }: GnaniVoiceAssistantProps) {
  const { toast } = useToast();
  const invalidateLedger = useInvalidateLedger();
  const processVoice = useProcessVoice();
  const { language: appLanguage, setLanguage: setAppLanguage, t } = useI18n();

  // Language state synchronized with dashboard global i18n
  const [language, setLanguage] = useState<"kn" | "hi" | "en">(appLanguage);

  useEffect(() => {
    setLanguage(appLanguage);
  }, [appLanguage]);

  // Assistant states
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [spokenMessage, setSpokenMessage] = useState("");
  const [pendingOp, setPendingOp] = useState<any>(null);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LastResultDetails | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { key: "listen", labelEn: "Listening to voice", labelKn: "ಧ್ವನಿಯನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ", labelHi: "आवाज़ सुनी जा रही है", status: "pending" },
    { key: "transcribe", labelEn: "Transcribing speech", labelKn: "ಮಾತನ್ನು ಪಠ್ಯಕ್ಕೆ ಬದಲಿಸಲಾಗುತ್ತಿದೆ", labelHi: "आवाज़ को टेक्स्ट में बदला जा रहा है", status: "pending" },
    { key: "understand", labelEn: "Understanding command & details", labelKn: "ಆದೇಶ ಮತ್ತು ವಿವರಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ", labelHi: "कमांड और विवरण समझा जा रहा है", status: "pending" },
    { key: "customer", labelEn: "Verifying / resolving customer", labelKn: "ಗ್ರಾಹಕರ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ", labelHi: "ग्राहक का सत्यापन किया जा रहा है", status: "pending" },
    { key: "ledger", labelEn: "Recording & updating ledger", labelKn: "ಖಾತೆ ಮತ್ತು ಲೆಡ್ಜರ್ ಅಪ್‌ಡೇಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ", labelHi: "खाता और लेजर अपडेट किया जा रहा है", status: "pending" },
    { key: "done", labelEn: "Completed", labelKn: "ಪೂರ್ಣಗೊಂಡಿದೆ", labelHi: "पूर्ण हुआ", status: "pending" },
  ]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<string>("");
  const isListeningRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const languageRef = useRef<"kn" | "hi" | "en">(language);

  // Keep languageRef updated
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Play audio response from Gnani Timbre or browser fallback
  const playResponseAudio = useCallback(
    (audioData?: any, fallbackText?: string, respLang?: string) => {
      if (audioData?.audio_base64) {
        try {
          const audioSrc = `data:${audioData.format || "audio/wav"};base64,${audioData.audio_base64}`;
          setAudioUrl(audioSrc);
          const audio = audioPlayerRef.current || new Audio();
          audio.src = audioSrc;
          audio.currentTime = 0;
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn("Audio autoplay blocked by browser policy, fallback to user-interaction audio:", err);
            });
          }
          return;
        } catch (e) {
          console.warn("Failed to play Timbre audio:", e);
        }
      }

      // Fallback: stream neural Indic audio or browser speech synthesis if audio_base64 not available
      if (typeof window !== "undefined" && fallbackText) {
        try {
          const streamUrl = `/api/ai/tts?text=${encodeURIComponent(fallbackText)}&language=${encodeURIComponent(respLang || languageRef.current)}`;
          const audio = audioPlayerRef.current || new Audio();
          audio.src = streamUrl;
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(fallbackText);
                const l = respLang || languageRef.current;
                utterance.lang = l === "kn" ? "kn-IN" : l === "hi" ? "hi-IN" : "en-IN";
                window.speechSynthesis.speak(utterance);
              }
            });
            return;
          }
        } catch {
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(fallbackText);
            const l = respLang || languageRef.current;
            utterance.lang = l === "kn" ? "kn-IN" : l === "hi" ? "hi-IN" : "en-IN";
            window.speechSynthesis.speak(utterance);
          }
        }
      }
    },
    []
  );

  // Convert audio blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Start MediaRecorder for direct audio capture
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.warn("MediaRecorder start failed or not supported:", err);
    }
  };

  const stopAudioRecording = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        resolve(null);
        return;
      }

      mr.onstop = async () => {
        try {
          const mime = mr.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });
          // Stop media tracks
          mr.stream.getTracks().forEach((track) => track.stop());
          if (audioBlob.size > 0) {
            const b64 = await blobToBase64(audioBlob);
            resolve(b64);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.warn("Failed converting audio to base64:", e);
          resolve(null);
        }
      };

      try {
        mr.stop();
      } catch {
        resolve(null);
      }
    });
  };
  // Welcome introductions per language
  const welcomeMessages: Record<"kn" | "hi" | "en", string> = {
    kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಜ್ಞಾನಿ (Gnani) AI ಧ್ವನಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಖಾತಾದಲ್ಲಿ ಉದ್ಧಾರ ಬರೆಯಲು, ಜಮಾ ದಾಖಲಿಸಲು, ಬಾಕಿ ಅಥವಾ ದಿನದ ವರದಿ ತಿಳಿಯಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ.",
    hi: "नमस्ते! मैं आपका ज्ञानी (Gnani) AI वॉयस असिस्टेंट हूँ। मैं आपके खाते में उधार जोड़ने, जमा दर्ज करने, बकाया देखने और दैनिक रिपोर्ट जानने में मदद कर सकता हूँ। बोलने के लिए माइक दबाएं।",
    en: "Hello! I am your Gnani AI Voice Assistant. I can help you record Udhar credit, add payments, check balances, and view your daily report. Tap the mic to speak.",
  };

  const handleOpenAssistant = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setSessionId(crypto.randomUUID());
      const welcome = welcomeMessages[language];
      setSpokenMessage(welcome);
      playResponseAudio(undefined, welcome);
    } else {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleLanguageChange = (newLang: "kn" | "hi" | "en") => {
    setLanguage(newLang);
    setAppLanguage(newLang);
    languageRef.current = newLang;
    const welcome = welcomeMessages[newLang];
    setSpokenMessage(welcome);
    playResponseAudio(undefined, welcome);
  };

  const updateStep = (key: ProcessingStepKey, status: "pending" | "active" | "completed" | "error", detail?: string) => {
    setProcessingSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  };

  const resetSteps = () => {
    setProcessingSteps([
      { key: "listen", labelEn: "Listening to voice", labelKn: "ಧ್ವನಿಯನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ", labelHi: "आवाज़ सुनी जा रही है", status: "pending" },
      { key: "transcribe", labelEn: "Transcribing speech", labelKn: "ಮಾತನ್ನು ಪಠ್ಯಕ್ಕೆ ಬದಲಿಸಲಾಗುತ್ತಿದೆ", labelHi: "आवाज़ को टेक्स्ट में बदला जा रहा है", status: "pending" },
      { key: "understand", labelEn: "Understanding command & details", labelKn: "ಆದೇಶ ಮತ್ತು ವಿವರಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ", labelHi: "कमांड और विवरण समझा जा रहा है", status: "pending" },
      { key: "customer", labelEn: "Verifying / resolving customer", labelKn: "ಗ್ರಾಹಕರ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ", labelHi: "ग्राहक का सत्यापन किया जा रहा है", status: "pending" },
      { key: "ledger", labelEn: "Recording & updating ledger", labelKn: "ಖಾತೆ ಮತ್ತು ಲೆಡ್ಜರ್ ಅಪ್‌ಡೇಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ", labelHi: "खाता और लेजर अपडेट किया जा रहा है", status: "pending" },
      { key: "done", labelEn: "Completed", labelKn: "ಪೂರ್ಣಗೊಂಡಿದೆ", labelHi: "पूर्ण हुआ", status: "pending" },
    ]);
  };

  // Send request to /api/ai/voice/process
  const handleProcess = useCallback(
    async (params: {
      text?: string;
      audio_base64?: string;
      confirmed?: boolean;
      pending_operation?: any;
    }) => {
      const isConfirm = Boolean(params.confirmed);
      const textToProcess = params.text?.trim() || "";

      // Prevent empty submissions unless confirming a pending operation
      if (!isConfirm && !textToProcess && !params.audio_base64) {
        setState("idle");
        updateStep("transcribe", "error", "No speech detected");
        return;
      }

      // Concurrency guard to prevent duplicate submissions
      if (isSubmittingRef.current && !isConfirm) {
        return;
      }
      isSubmittingRef.current = true;

      if (isConfirm) {
        setState("executing");
        updateStep("ledger", "active");
      } else {
        setState("understanding");
        updateStep("understand", "active");
      }

      try {
        const res = await processVoice.mutateAsync({
          data: {
            text: textToProcess || undefined,
            audio_base64: params.audio_base64,
            language: languageRef.current,
            session_id: sessionId,
            confirmed: params.confirmed ?? false,
            auto_create_customer: true,
            pending_operation: params.pending_operation ?? pendingOp,
            idempotency_key: crypto.randomUUID(),
          },
        });

        const respLang = (res as any).language || languageRef.current;
        setSpokenMessage(res.message);
        playResponseAudio(res.audio, res.message, respLang);

        // Mark understanding as completed
        updateStep("understand", "completed");

        // Customer verification check
        if (res.customer) {
          const isNew = Boolean((res as any).newly_created_customer || res.pending_operation?.newly_created_customer);
          const custName = (res.customer as any).customer_name;
          updateStep("customer", "completed", isNew ? `New customer created: ${custName}` : `Customer verified: ${custName}`);
        }

        if (res.status === "confirmation_required") {
          setState("awaiting_confirmation");
          setPendingOp(res.pending_operation);
          setMatchedCustomer((res.customer as Customer) || null);
          updateStep("ledger", "pending", "Awaiting confirmation");
        } else if (res.status === "amount_missing" || res.status === "clarification_needed") {
          setState("awaiting_confirmation");
          if (res.pending_operation) {
            setPendingOp(res.pending_operation);
          }
          if (res.customer) {
            setMatchedCustomer((res.customer as Customer) || null);
          }
          updateStep("understand", "active", "Amount or details missing");
        } else if (res.status === "committed") {
          setState("completed");
          setPendingOp(null);
          updateStep("ledger", "completed", "Transaction committed in PostgreSQL");
          updateStep("done", "completed", "Ledger synchronized");

          // Save presentation result card details
          const isNew = Boolean((res as any).newly_created_customer || (res.pending_operation as any)?.newly_created_customer);
          const cust = res.customer as any;
          setLastResult({
            customerName: cust?.customer_name || "Customer",
            isNewCustomer: isNew,
            transactionType: (res.intent === "add_credit" ? "credit" : "payment"),
            amount: (res.transaction as any)?.amount || (res.pending_operation as any)?.amount,
            balance: cust?.balance,
            message: res.message,
          });

          // Invalidate React Query cache across all dashboard pages!
          invalidateLedger();
          toast({
            title: languageRef.current === "kn" ? "ವ್ಯವಹಾರ ಯಶಸ್ವಿಯಾಗಿದೆ" : languageRef.current === "hi" ? "लेनदेन सफल" : "Transaction committed",
            description: res.message,
          });
        } else if (res.status === "cancelled") {
          setState("idle");
          setPendingOp(null);
          updateStep("ledger", "error", "Operation cancelled");
        } else if (res.status === "multiple_matches") {
          setState("error");
          setCandidates((res.candidates as Customer[]) || []);
          updateStep("customer", "error", "Multiple customers matched");
        } else if (res.status === "customer_not_found") {
          setState("error");
          updateStep("customer", "error", "Customer not found");
        } else {
          // get_balance, daily_report, etc.
          setState("completed");
          updateStep("done", "completed");
          if (res.customer) {
            setMatchedCustomer(res.customer as Customer);
            setLastResult({
              customerName: (res.customer as any).customer_name,
              isNewCustomer: false,
              transactionType: "inquiry",
              balance: (res.customer as any).balance,
              message: res.message,
            });
          }
        }
      } catch (err: any) {
        setState("error");
        updateStep("understand", "error");
        const errMsg = err?.data?.error || err?.message || "Failed to process voice command";
        setSpokenMessage(errMsg);
        playResponseAudio(undefined, errMsg);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [processVoice, sessionId, pendingOp, invalidateLedger, playResponseAudio, toast]
  );

  // Initialize Speech Recognition
  const startListening = () => {
    resetSteps();
    transcriptRef.current = "";
    isListeningRef.current = true;
    updateStep("listen", "active");
    setState("listening");
    setSpokenMessage("");
    setTranscript("");

    // Start background MediaRecorder to stream raw audio to Gnani Prisma STT if browser SpeechRec fails
    startAudioRecording();

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      // Guarantee actual locale from active language
      const currentLang = languageRef.current;
      rec.lang = currentLang === "kn" ? "kn-IN" : currentLang === "hi" ? "hi-IN" : "en-IN";

      rec.onstart = () => {
        isListeningRef.current = true;
        setState("listening");
        updateStep("listen", "active");
      };

      rec.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0]?.transcript || "";
        }
        transcriptRef.current = fullTranscript;
        setTranscript(fullTranscript);
        if (fullTranscript.trim()) {
          updateStep("listen", "completed");
          updateStep("transcribe", "active", fullTranscript.trim());
        }
      };

      rec.onerror = async (e: any) => {
        console.warn("Speech recognition error:", e);
        isListeningRef.current = false;

        // If Web Speech API gives network/service error, fallback to recorded audio stream sent directly to Gnani Prisma!
        if (e?.error === "network" || e?.error === "no-speech" || e?.error === "audio-capture") {
          updateStep("listen", "completed");
          updateStep("transcribe", "active", "Processing audio via Gnani Prisma...");
          setState("transcribing");
          const audioB64 = await stopAudioRecording();
          if (audioB64) {
            handleProcess({ audio_base64: audioB64 });
            return;
          }
        }

        updateStep("listen", "error", e?.error || "Microphone capture failed");
        setState("error");
        setSpokenMessage(e?.error === "not-allowed" ? "Microphone permission denied" : "Speech recognition network/service notice. You can also type or use quick prompts below.");
      };

      rec.onend = async () => {
        isListeningRef.current = false;
        updateStep("listen", "completed");
        const finalRecordedText = transcriptRef.current.trim();
        const audioB64 = await stopAudioRecording();

        if (finalRecordedText) {
          updateStep("transcribe", "completed", finalRecordedText);
          setState("transcribing");
          // Reliable transcript submission using transcriptRef directly:
          handleProcess({ text: finalRecordedText });
        } else if (audioB64) {
          // If browser Speech API returned empty transcript but audio was captured, send directly to Gnani Prisma STT!
          updateStep("transcribe", "completed", "Audio sent to Gnani Prisma");
          setState("transcribing");
          handleProcess({ audio_base64: audioB64 });
        } else {
          updateStep("transcribe", "error", "No speech detected. Tap mic to speak or use quick prompts.");
          setState("idle");
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        isListeningRef.current = false;
        updateStep("listen", "error", "Failed to start recognition");
        setState("error");
      }
    } else {
      // Browser doesn't support Web Speech API - fallback to pure audio capture
      toast({
        title: "Voice Assistant",
        description: "Recording audio via microphone for Gnani Prisma STT.",
      });
    }
  };

  const stopListening = async () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const handleConfirm = () => {
    if (pendingOp) {
      handleProcess({ confirmed: true, pending_operation: pendingOp });
    }
  };

  const handleCancel = () => {
    if (pendingOp) {
      handleProcess({ text: "beda", confirmed: false, pending_operation: pendingOp });
    } else {
      setState("idle");
      setIsOpen(false);
    }
  };

  // Helper sample quick prompts
  const samplePrompts = {
    kn: [
      "save ramesh's 2000 rupees",
      "ರಮೇಶ್ ಹೆಸರಲ್ಲಿ 2000 ಬರಿ",
      "ರಮೇಶ್ 500 ಕೊಟ್ಟಿದ್ದಾನೆ",
      "ರಮೇಶ್ ಎಷ್ಟು ಬಾಕಿ ಇದ್ದಾನೆ?",
      "ಇವತ್ತು ಎಷ್ಟು ಬಿಸಿನೆಸ್ ಆಗಿದೆ?",
    ],
    hi: [
      "save ramesh's 2000 rupees",
      "रमेश के नाम 2000 लिखो",
      "रमेश ने 500 दिए",
      "रमेश का बैलेंस कितना है?",
      "आज कितना बिजनेस हुआ?",
    ],
    en: [
      "save ramesh's 2000 rupees",
      "Add 2000 credit for Ramesh",
      "Record 500 payment from Ramesh",
      "What is Ramesh's balance?",
      "Show today's daily report",
    ],
  };

  return (
    <>
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Floating or Embedded Voice Trigger Button */}
      <div className={cn("inline-flex items-center gap-2", className)}>
        <Button
          type="button"
          onClick={() => handleOpenAssistant(true)}
          data-testid="button-voice-assistant"
          variant="outline"
          className="relative gap-2 bg-card hover:bg-muted font-medium border-primary/20 shadow-xs"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <Mic className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Gnani Voice</span>
        </Button>
      </div>

      {/* Dialog Modal for Voice Assistance Interaction */}
      <Dialog open={isOpen} onOpenChange={handleOpenAssistant}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 font-display text-lg">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span>Gnani AI Voice Assistant</span>
              </DialogTitle>
              {/* Language Selector */}
              <div className="flex rounded-md border bg-muted p-0.5 text-xs font-semibold">
                {(["kn", "hi", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLanguageChange(l)}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors uppercase",
                      language === l ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {l === "kn" ? "ಕನ್ನಡ" : l === "hi" ? "हिंदी" : "EN"}
                  </button>
                ))}
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {language === "kn"
                ? "ಉಧಾರ್, ಜಮಾ ದಾಖಲಿಸಲು, ಬಾಕಿ ವಿಚಾರಿಸಲು ಅಥವಾ ಮಾರಾಟ ತಿಳಿಯಲು ಕನ್ನಡದಲ್ಲಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ."
                : language === "hi"
                ? "उधार, जमा दर्ज करने, बकाया पूछने या दैनिक बिक्री जानने के लिए हिंदी में सहजता से बोलें।"
                : "Speak naturally in English, Hindi, or Kannada to record Udhar, payments, check balances, or get daily sales."}
            </DialogDescription>
          </DialogHeader>

          {/* Central Voice Status & Mic Interface */}
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative">
              {state === "listening" && (
                <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping scale-150" />
              )}
              <button
                type="button"
                onClick={state === "listening" ? stopListening : startListening}
                data-testid="button-mic-activate"
                disabled={state === "processing" || state === "executing"}
                className={cn(
                  "relative h-20 w-20 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4",
                  state === "listening"
                    ? "bg-rose-600 text-white ring-rose-300 scale-105 animate-pulse"
                    : state === "processing" || state === "executing"
                    ? "bg-amber-500 text-white animate-spin ring-amber-200"
                    : "bg-primary text-primary-foreground hover:scale-105 ring-primary/20"
                )}
                aria-label={state === "listening" ? "Stop recording" : "Start recording"}
              >
                {state === "listening" ? (
                  <MicOff className="h-8 w-8" />
                ) : state === "processing" || state === "executing" ? (
                  <RefreshCw className="h-8 w-8 animate-spin" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
            </div>

            {/* State status text */}
            <div className="text-center space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                {state === "listening"
                  ? (language === "kn" ? "ಆಲಿಸಲಾಗುತ್ತಿದೆ..." : language === "hi" ? "सुन रहे हैं..." : "Listening...")
                  : state === "processing"
                  ? (language === "kn" ? "ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ..." : language === "hi" ? "प्रक्रिया जारी है..." : "Processing...")
                  : state === "understanding"
                  ? (language === "kn" ? "ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ..." : language === "hi" ? "कमांड समझ रहे हैं..." : "Understanding...")
                  : state === "awaiting_confirmation"
                  ? (language === "kn" ? "ದೃಢೀಕರಣ ಅಗತ್ಯವಿದೆ" : language === "hi" ? "पुष्टि की आवश्यकता है" : "Awaiting Confirmation")
                  : state === "executing"
                  ? (language === "kn" ? "ಖಾತೆಗೆ ದಾಖಲಿಸಲಾಗುತ್ತಿದೆ..." : language === "hi" ? "खाते में दर्ज किया जा रहा है..." : "Recording to Khata...")
                  : state === "completed"
                  ? (language === "kn" ? "ಪೂರ್ಣಗೊಂಡಿದೆ!" : language === "hi" ? "सफलतापूर्वक पूर्ण!" : "Completed!")
                  : state === "error"
                  ? (language === "kn" ? "ದೋಷ" : language === "hi" ? "सूचना / त्रुटि" : "Notice / Error")
                  : (language === "kn" ? "ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ" : language === "hi" ? "बोलने के लिए माइक दबाएं" : "Tap Mic to Speak")}
              </span>

              {transcript && (
                <p className="text-sm italic font-medium text-foreground bg-muted/60 rounded px-3 py-1.5 max-w-xs break-words">
                  "{transcript}"
                </p>
              )}
            </div>

            {/* Manual text / voice edit input field to correct or enter text */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (transcript.trim()) {
                  handleProcess({ text: transcript.trim() });
                }
              }}
              className="w-full flex items-center gap-2 mt-1"
            >
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={
                  language === "kn"
                    ? "ಆದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ತಿದ್ದಿ..."
                    : language === "hi"
                    ? "कमांड टाइप करें या बदलें..."
                    : "Type or edit command..."
                }
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={state === "processing" || state === "executing"}
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                className="h-8 text-xs font-semibold px-3"
                disabled={!transcript.trim() || state === "processing" || state === "executing"}
              >
                {language === "kn" ? "ಕಳುಹಿಸಿ" : language === "hi" ? "भेजें" : "Send"}
              </Button>
            </form>

            {/* Assistant Voice Spoken Message */}
            {spokenMessage && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs sm:text-sm text-amber-950 flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (audioUrl) {
                      const audio = new Audio(audioUrl);
                      audio.play().catch(() => {});
                    } else if (spokenMessage) {
                      playResponseAudio(undefined, spokenMessage);
                    }
                  }}
                  className="rounded-full p-1 hover:bg-amber-100 transition-colors"
                  title="Replay Voice (Gnani Timbre)"
                >
                  <Volume2 className="h-4 w-4 shrink-0 text-amber-700 animate-pulse mt-0.5" />
                </button>
                <div className="flex-1 font-medium leading-relaxed">{spokenMessage}</div>
              </div>
            )}

            {/* Multiple candidates disambiguation */}
            {candidates.length > 0 && (
              <div className="w-full space-y-2 border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground">
                  {language === "kn" ? "ಗ್ರಾಹಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ:" : language === "hi" ? "ग्राहक चुनें:" : "Choose customer:"}
                </p>
                <div className="grid gap-1.5">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCandidates([]);
                        handleProcess({ text: `${c.customer_name} hesralli 100 bari` });
                      }}
                      className="flex items-center justify-between rounded border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      <span>{c.customer_name}</span>
                      <span className="text-muted-foreground">{c.mobile_number || "No mobile"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Action Box */}
          {state === "awaiting_confirmation" && pendingOp && (
            <div className="border-t pt-4 space-y-3">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">
                    {language === "kn" ? "ಕಾರ್ಯಾಚರಣೆ:" : language === "hi" ? "कार्य:" : "Operation:"}
                  </span>
                  <span className="capitalize text-primary font-bold">{pendingOp.intent?.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">
                    {language === "kn" ? "ಗ್ರಾಹಕರು:" : language === "hi" ? "ग्राहक:" : "Customer:"}
                  </span>
                  <span>{pendingOp.customer_name}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span className="text-muted-foreground">
                    {language === "kn" ? "ಮೊತ್ತ:" : language === "hi" ? "राशि:" : "Amount:"}
                  </span>
                  <span className="font-bold text-credit">{formatINR(pendingOp.amount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  data-testid="button-voice-cancel"
                >
                  <X className="h-4 w-4 mr-1.5 text-rose-500" />
                  {language === "kn" ? "ರದ್ದುಮಾಡಿ" : language === "hi" ? "रद्द करें" : "Cancel"}
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleConfirm}
                  data-testid="button-voice-confirm"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {language === "kn" ? "ದೃಢೀಕರಿಸಿ" : language === "hi" ? "पुष्टि करें" : "Confirm"}
                </Button>
              </div>
            </div>
          )}

          {/* Sample Voice Commands */}
          <div className="border-t pt-3 space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {language === "kn"
                ? "ಮಾದರಿ ಧ್ವನಿ ಆದೇಶಗಳು:"
                : language === "hi"
                ? "त्वरित नमूना कमांड:"
                : "Quick sample prompts:"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts[language].map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTranscript(prompt);
                    handleProcess({ text: prompt });
                  }}
                  className="text-[11px] bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-2.5 py-1 text-left transition-colors font-medium"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="sm:justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>Gnani Prisma • Aion • Timbre</span>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              {language === "kn" ? "ಮುಚ್ಚಿ" : language === "hi" ? "बंद करें" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
