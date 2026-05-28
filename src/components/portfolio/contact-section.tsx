"use client";

/**
 * ContactSection — "Get in Touch" + "Send a Message" pair, now a Client
 * Component (Task 11.1, Requirement 8).
 *
 * What this file owns:
 *   - 8.1: Two-card stagger on viewport entry with ≤120 ms gap, driven by
 *     `motionVariants.staggeredReveal(120)` and `whileInView` (`once: true`).
 *     Each card is wrapped in a child variant so motion's `staggerChildren`
 *     cascades the pair.
 *   - 8.2: Material-style floating-label transition. Field border + label
 *     position both animate inside `motionDurations.formField` (250 ms).
 *     The label "floats" up + shrinks when the field is focused or holds a
 *     non-empty value.
 *   - 8.3: Inline progress indicator scheduled 100 ms after submit.
 *     A submission that resolves before the 100 ms deadline cancels the
 *     timer so the indicator is skipped entirely (no flash). Once the
 *     submission resolves, the panel transitions to a textual + iconographic
 *     success or error state.
 *   - 8.4: On validation failure each offending field gets `aria-invalid="true"`
 *     plus a textual error message rendered adjacent to it. Keyboard focus
 *     is moved to the first invalid field.
 *   - 8.5: Material-style ripple on every quick-action link in "Get in Touch"
 *     and on the submit CTA, via `usePressRipple()`. Anchors and the button
 *     are `position: relative` + `overflow: hidden` so the ripple clips.
 *   - 8.6: Under reduced motion, the staggered reveal and the floating-label
 *     transition are skipped (no `motion` timeline scheduled, label snaps to
 *     its final position). Focus rings and validation feedback stay intact.
 *   - 17.7: Validation errors carry an icon + textual message — never color
 *     alone — and submit-status messages do the same.
 *
 * Network failure (per design.md §14): a single inline error message is
 * rendered with the email link as a fallback CTA. The current handler
 * simulates a successful submission; a real backend (Formspree / server
 * action) can replace `submitMessage` without changing the UI surface.
 */

import {
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { motion, type Variants } from "motion/react";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Check,
  Loader2,
  Mail,
  Send,
} from "lucide-react";

import {
  LiquidMetalCard as Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/liquid-metal-card";
import { profile, socialLinks } from "@/lib/portfolio-data";
import {
  motionDurations,
  motionVariants,
  useReducedMotionState,
} from "@/lib/motion-engine";
import { usePressRipple } from "@/components/ui/ripple";
import { cn } from "@/lib/utils";

import { SectionLabel } from "./section-label";
import { GitHubIcon, LinkedInIcon } from "./brand-icons";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Per-step gap between the two cards (Requirement 8.1: ≤ 120 ms). */
const STAGGER_STEP_MS = 120;

/**
 * Border + floating-label animation budget (Requirement 8.2: ≤ 250 ms),
 * sourced from the shared `motionDurations.formField` so the contact form
 * cannot drift away from the rest of the page's motion language.
 */
const FORM_FIELD_DURATION_MS = motionDurations.formField;

/**
 * Inline progress indicator deadline (Requirement 8.3): the indicator is
 * shown only if the submission has not resolved within this window. A
 * faster resolution clears the timer so the indicator never flashes.
 */
const PROGRESS_DELAY_MS = 100;

/**
 * Loose RFC 5322 sanity check — sufficient for client-side validation.
 * The server is responsible for authoritative validation.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Variants applied to the two-card grid: parent cascades children with a
 * 120 ms gap (motionVariants.staggeredReveal), each child fades + rises 8 px.
 */
const PARENT_VARIANTS = motionVariants.staggeredReveal(STAGGER_STEP_MS);
const CHILD_VARIANTS: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// ContactRow — quick-action link row with a press ripple
// ---------------------------------------------------------------------------

interface ContactRowProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href: string;
}

function ContactRow({ icon, title, subtitle, href }: ContactRowProps) {
  const external = href.startsWith("http");
  const { bind, ripples } = usePressRipple<HTMLAnchorElement>();

  return (
    <a
      ref={bind.ref}
      onPointerDown={bind.onPointerDown}
      onKeyDown={bind.onKeyDown}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group relative flex items-center gap-4 overflow-hidden border-b border-black/[0.06] px-6 py-3.5 transition-colors duration-150 ease-in-out last:border-b-0 hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-card-solid dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
    >
      <span className="text-muted-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-base font-medium text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block truncate font-sans text-sm text-muted-2">
          {subtitle}
        </span>
      </span>
      <ArrowUpRight className="size-5 text-muted-2 transition-colors duration-150 group-hover:text-foreground" />
      {ripples}
    </a>
  );
}

// ---------------------------------------------------------------------------
// FloatingField — Material floating-label input / textarea
// ---------------------------------------------------------------------------

type FloatingFieldRef = HTMLInputElement | HTMLTextAreaElement;

interface FloatingFieldProps {
  id: string;
  label: string;
  type?: "text" | "email";
  multiline?: boolean;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  inputRef: React.RefObject<FloatingFieldRef | null>;
  required?: boolean;
}

function FloatingField({
  id,
  label,
  type = "text",
  multiline = false,
  value,
  onChange,
  error,
  disabled,
  autoComplete,
  inputRef,
  required,
}: FloatingFieldProps) {
  const reduced = useReducedMotionState();
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  const floated = focused || filled;
  const errored = Boolean(error);
  const errorId = `${id}-error`;

  // Border + background transition (Requirement 8.2). Skipped under reduced
  // motion so no animation timeline is scheduled (Requirement 8.6).
  const fieldTransition = reduced
    ? "none"
    : `border-color ${FORM_FIELD_DURATION_MS}ms ease-out, background-color ${FORM_FIELD_DURATION_MS}ms ease-out`;

  // Floating-label transition (Requirement 8.2). Reduced motion snaps the
  // label to its final position with no easing (Requirement 8.6 / 17.2).
  const labelTransition = reduced
    ? "none"
    : `transform ${FORM_FIELD_DURATION_MS}ms ease-out, font-size ${FORM_FIELD_DURATION_MS}ms ease-out, color ${FORM_FIELD_DURATION_MS}ms ease-out`;

  const fieldClassName = cn(
    "block w-full rounded-lg border bg-background px-4 font-sans text-base text-foreground placeholder-transparent focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
    multiline ? "min-h-32 resize-none pt-7 pb-3" : "h-14 pt-6 pb-2",
    errored
      ? "border-red-500/70 focus:border-red-500 dark:border-red-400/70 dark:focus:border-red-400"
      : "border-input hover:border-black/[0.16] focus:border-[var(--ring-accent)] dark:hover:border-white/[0.15] dark:focus:border-[var(--ring-accent)]",
  );

  const labelClassName = cn(
    "pointer-events-none absolute left-4 top-2 origin-left select-none font-sans",
    floated
      ? "translate-y-0 text-xs font-medium"
      : multiline
        ? "translate-y-2 text-base"
        : "translate-y-3 text-base",
    errored
      ? "text-red-500 dark:text-red-400"
      : floated
        ? "text-foreground/80"
        : "text-muted-2",
  );

  const handleFocus = () => setFocused(true);
  const handleBlur = () => setFocused(false);

  // Common props for either <input> or <textarea>. Strongly typed with the
  // discriminated `multiline` flag below so we never feed `type=` to the
  // textarea path.
  return (
    <div>
      <div className="relative">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement | null>}
            id={id}
            name={id}
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            autoComplete={autoComplete}
            required={required}
            aria-invalid={errored ? true : undefined}
            aria-describedby={errored ? errorId : undefined}
            placeholder={label}
            className={fieldClassName}
            style={{ transition: fieldTransition }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement | null>}
            id={id}
            name={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            autoComplete={autoComplete}
            required={required}
            aria-invalid={errored ? true : undefined}
            aria-describedby={errored ? errorId : undefined}
            placeholder={label}
            className={fieldClassName}
            style={{ transition: fieldTransition }}
          />
        )}
        <label
          htmlFor={id}
          className={labelClassName}
          style={{ transition: labelTransition }}
        >
          {label}
        </label>
      </div>
      {errored && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 font-sans text-xs text-red-500 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 size-3.5 flex-none" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submit handler — simulated success path
// ---------------------------------------------------------------------------

interface MessagePayload {
  name: string;
  email: string;
  message: string;
}

type SubmissionResult =
  | { ok: true }
  | { ok: false; reason: "network" };

/**
 * Stand-in for a real submission backend. Replace this with a Formspree
 * fetch or a Next.js server action when one is wired in. Always resolves
 * with `{ ok: true }` after ~800 ms so the inline progress indicator gets
 * exercised end-to-end (Requirement 8.3).
 */
async function submitMessage(payload: MessagePayload): Promise<SubmissionResult> {
  // Touch the payload so the parameter is observed by lint and any future
  // logging hook gets a hand-hold without a refactor. The real backend will
  // forward this to Formspree / a server action.
  void payload;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: true }), 800);
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface FormValues {
  name: string;
  email: string;
  message: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = "Please tell me your name.";
  }
  const trimmedEmail = values.email.trim();
  if (!trimmedEmail) {
    errors.email = "Email is required so I can reply.";
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.message.trim()) {
    errors.message = "Add a short note before sending.";
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting"; showIndicator: boolean }
  | { kind: "success" }
  | { kind: "error"; reason: "network" };

export function ContactSection() {
  const reduced = useReducedMotionState();

  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });

  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const submitRipple = usePressRipple<HTMLButtonElement>();

  const setField = <K extends keyof FormValues>(key: K, next: string) => {
    setValues((prev) => ({ ...prev, [key]: next }));
    // Clear the field's error as soon as the user edits it so the validation
    // feedback feels responsive without re-validating mid-keystroke.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const focusFirstInvalid = (errs: FormErrors) => {
    if (errs.name) {
      nameRef.current?.focus();
      return;
    }
    if (errs.email) {
      emailRef.current?.focus();
      return;
    }
    if (errs.message) {
      messageRef.current?.focus();
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === "submitting") return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      // Requirement 8.4: textual messages are rendered adjacent to the
      // offending fields and keyboard focus moves to the first invalid one.
      focusFirstInvalid(nextErrors);
      return;
    }

    // Track resolution outside of React state so the timer callback can
    // see the latest value synchronously (Requirement 8.3 race window).
    let resolved = false;
    setStatus({ kind: "submitting", showIndicator: false });

    const indicatorTimer = setTimeout(() => {
      if (resolved) return;
      setStatus({ kind: "submitting", showIndicator: true });
    }, PROGRESS_DELAY_MS);

    try {
      const result = await submitMessage(values);
      resolved = true;
      clearTimeout(indicatorTimer);
      if (result.ok) {
        setStatus({ kind: "success" });
        setValues({ name: "", email: "", message: "" });
      } else {
        setStatus({ kind: "error", reason: result.reason });
      }
    } catch {
      resolved = true;
      clearTimeout(indicatorTimer);
      setStatus({ kind: "error", reason: "network" });
    }
  };

  const isSubmitting = status.kind === "submitting";
  const showIndicator = status.kind === "submitting" && status.showIndicator;
  const showSuccess = status.kind === "success";
  const showError = status.kind === "error";

  // Common card markup factored into nodes so the wrapping motion.div /
  // plain div can swap without duplicating the JSX subtree.
  const getInTouchCard = (
    <Card className="flex h-full flex-col px-7 py-6">
      <div className="mb-4">
        <CardTitle className="mb-2 font-sans text-2xl font-medium text-foreground">
          Get in Touch
        </CardTitle>
        <CardDescription className="font-sans text-base leading-[1.6] text-muted-foreground dark:text-[#b2b2b2]">
          Choose your preferred method to connect and discuss your project.
        </CardDescription>
      </div>
      <div className="-mx-6">
        <ContactRow
          icon={<Calendar className="size-6" />}
          title="Schedule a free call"
          subtitle="30-minute strategy session"
          href={`mailto:${profile.email}?subject=Project%20call`}
        />
        <ContactRow
          icon={<Mail className="size-6" />}
          title={profile.email}
          subtitle="Quick inquiries and questions"
          href={socialLinks.email}
        />
        <ContactRow
          icon={<LinkedInIcon className="size-6" />}
          title="Connect on LinkedIn"
          subtitle="Open to roles and collaboration"
          href={socialLinks.linkedin}
        />
        <ContactRow
          icon={<GitHubIcon className="size-6" />}
          title="GitHub"
          subtitle="See my code and projects"
          href={socialLinks.github}
        />
      </div>
      <p className="mt-5 font-sans text-sm text-muted-2">
        Open to internship and full-time roles. Replies within 24 hours.
      </p>
    </Card>
  );

  const sendMessageCard = (
    <Card className="h-full px-7 py-6">
      <div className="mb-4">
        <CardTitle className="mb-2 font-sans text-2xl font-medium text-foreground">
          Send a Message
        </CardTitle>
        <CardDescription className="font-sans text-base leading-[1.6] text-muted-foreground dark:text-[#b2b2b2]">
          Prefer to write? Send a short note and I will reply soon.
        </CardDescription>
      </div>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <FloatingField
          id="contact-name"
          label="Full name"
          value={values.name}
          onChange={(v) => setField("name", v)}
          error={errors.name}
          disabled={isSubmitting}
          autoComplete="name"
          inputRef={nameRef}
          required
        />
        <FloatingField
          id="contact-email"
          label="Email address"
          type="email"
          value={values.email}
          onChange={(v) => setField("email", v)}
          error={errors.email}
          disabled={isSubmitting}
          autoComplete="email"
          inputRef={emailRef}
          required
        />
        <FloatingField
          id="contact-message"
          label="Your message"
          multiline
          value={values.message}
          onChange={(v) => setField("message", v)}
          error={errors.message}
          disabled={isSubmitting}
          inputRef={messageRef}
          required
        />
        <button
          ref={submitRipple.bind.ref}
          onPointerDown={submitRipple.bind.onPointerDown}
          onKeyDown={submitRipple.bind.onKeyDown}
          type="submit"
          disabled={isSubmitting}
          className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-input bg-background px-5 py-3.5 font-sans text-base font-medium text-foreground transition-[background-color,border-color] duration-200 ease-out hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-card-solid disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>Send Message</span>
          <Send className="size-5" aria-hidden />
          {submitRipple.ripples}
        </button>

        {/* Inline submission status panel (Requirements 8.3, 17.7). */}
        {showIndicator && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 font-sans text-sm text-muted-2"
          >
            <Loader2
              className={cn("size-4", reduced ? undefined : "animate-spin")}
              aria-hidden
            />
            <span>Sending your message…</span>
          </div>
        )}
        {showSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 font-sans text-sm text-emerald-600 dark:text-emerald-400"
          >
            <Check className="size-4 flex-none" aria-hidden />
            <span>Message sent. I will reply within 24 hours.</span>
          </div>
        )}
        {showError && (
          <div
            role="alert"
            className="flex items-start gap-2 font-sans text-sm text-red-500 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 size-4 flex-none" aria-hidden />
            <span>
              Couldn&apos;t send. Try again, or email me directly at{" "}
              <a
                href={socialLinks.email}
                className="underline underline-offset-2 hover:text-red-600 dark:hover:text-red-300"
              >
                {profile.email}
              </a>
              .
            </span>
          </div>
        )}
      </form>
    </Card>
  );

  // Reduced motion: render the whole tree in its final state with no motion
  // wrappers, no whileInView observers, and no spring transitions
  // (Requirements 8.6, 17.2, Property 1).
  if (reduced) {
    return (
      <section id="contact" className="mt-16 scroll-mt-32">
        <SectionLabel>Let&apos;s Work Together</SectionLabel>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {getInTouchCard}
          {sendMessageCard}
        </div>
        <FooterQuote />
      </section>
    );
  }

  return (
    <section id="contact" className="mt-16 scroll-mt-32">
      <SectionLabel>Let&apos;s Work Together</SectionLabel>
      <motion.div
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
        variants={PARENT_VARIANTS}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.1 }}
      >
        <motion.div variants={CHILD_VARIANTS}>{getInTouchCard}</motion.div>
        <motion.div variants={CHILD_VARIANTS}>{sendMessageCard}</motion.div>
      </motion.div>
      <FooterQuote />
    </section>
  );
}

function FooterQuote() {
  return (
    <figure className="mt-10 rounded-xl border border-black/[0.05] bg-black/[0.005] px-7 py-6 text-center dark:border-white/[0.06] dark:bg-white/[0.02]">
      <blockquote className="font-sans text-base leading-[1.7] text-muted-foreground">
        Drop by drop is the water pot filled. Likewise, the wise person
        accumulates excellence gradually.
      </blockquote>
      <figcaption className="mt-3 font-sans text-sm text-muted-2">
        Buddha
      </figcaption>
    </figure>
  );
}
