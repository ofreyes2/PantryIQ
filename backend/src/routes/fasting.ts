import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const fastingRouter = new Hono();

// Zod schema for fasting phase calculation input
const calculatePhaseSchema = z.object({
  startTime: z.string().datetime(),
  currentTime: z.string().datetime(),
  protocol: z.enum(["16:8", "18:6", "20:4", "OMAD", "5:2", "custom"]),
  customHours: z.number().min(1).max(168).optional(),
});

type CalculatePhaseInput = z.infer<typeof calculatePhaseSchema>;

type FastingPhase =
  | "Fed State"
  | "Early Fasting"
  | "Fasting State"
  | "Deep Fasting"
  | "Metabolic Advantage"
  | "Extended Fast";

interface Milestone {
  hoursUntil: number;
  name: string;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
}

interface FastingPhaseResponse {
  phase: FastingPhase;
  hoursElapsed: number;
  targetHours: number;
  percentComplete: number;
  nextMilestone: Milestone;
  phaseDescription: string;
  timeRemaining: TimeRemaining;
}

/**
 * Get target hours from protocol
 */
function getTargetHours(
  protocol: CalculatePhaseInput["protocol"],
  customHours?: number
): number {
  switch (protocol) {
    case "16:8":
      return 16;
    case "18:6":
      return 18;
    case "20:4":
      return 20;
    case "OMAD":
      return 24;
    case "5:2":
      return 24; // 5:2 is typically calculated per day
    case "custom":
      return customHours || 16;
    default:
      return 16;
  }
}

/**
 * Determine fasting phase based on hours elapsed
 */
function determineFastingPhase(hoursElapsed: number): FastingPhase {
  if (hoursElapsed < 3) {
    return "Fed State";
  } else if (hoursElapsed < 12) {
    return "Early Fasting";
  } else if (hoursElapsed < 16) {
    return "Fasting State";
  } else if (hoursElapsed < 24) {
    return "Deep Fasting";
  } else if (hoursElapsed < 48) {
    return "Metabolic Advantage";
  } else {
    return "Extended Fast";
  }
}

/**
 * Get phase description
 */
function getPhaseDescription(phase: FastingPhase): string {
  switch (phase) {
    case "Fed State":
      return "Your body is processing your last meal with insulin levels high.";
    case "Early Fasting":
      return "Blood sugar is dropping and glycogen stores are starting to deplete.";
    case "Fasting State":
      return "Glycogen is mostly depleted and ketone production is increasing.";
    case "Deep Fasting":
      return "Ketones are at peak levels and autophagy is accelerating.";
    case "Metabolic Advantage":
      return "Maximum fat burning is occurring with significant cellular repair happening.";
    case "Extended Fast":
      return "Deep autophagy and immune system reset are in progress.";
    default:
      return "";
  }
}

/**
 * Get next milestone
 */
function getNextMilestone(hoursElapsed: number): Milestone {
  const milestones = [
    { hours: 4, name: "Insulin normalizing" },
    { hours: 8, name: "Glycogen depleting" },
    { hours: 12, name: "Ketone production ramping" },
    { hours: 16, name: "Metabolic shift peak" },
    { hours: 24, name: "Autophagy phase beginning" },
    { hours: 48, name: "Extended fast benefits" },
  ];

  for (const milestone of milestones) {
    if (hoursElapsed < milestone.hours) {
      return {
        hoursUntil: milestone.hours - hoursElapsed,
        name: milestone.name,
      };
    }
  }

  // If we've passed all milestones, return the last one
  return {
    hoursUntil: 0,
    name: "Extended fast benefits",
  };
}

/**
 * Calculate time remaining
 */
function calculateTimeRemaining(hoursRemaining: number): TimeRemaining {
  const totalSeconds = Math.max(0, hoursRemaining * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return { hours, minutes, seconds };
}

/**
 * POST /api/fasting/calculate-phase
 * Calculate which fasting phase user is in
 */
fastingRouter.post(
  "/calculate-phase",
  zValidator("json", calculatePhaseSchema),
  (c) => {
    try {
      const input = c.req.valid("json");

      // Parse timestamps
      const startDate = new Date(input.startTime);
      const currentDate = new Date(input.currentTime);

      // Calculate hours elapsed
      const diffMs = currentDate.getTime() - startDate.getTime();
      const hoursElapsed = diffMs / (1000 * 60 * 60);

      // Get target hours
      const targetHours = getTargetHours(input.protocol, input.customHours);

      // Determine current phase
      const phase = determineFastingPhase(hoursElapsed);

      // Calculate percent complete
      const percentComplete = Math.min(
        100,
        Math.round((hoursElapsed / targetHours) * 100)
      );

      // Get phase description
      const phaseDescription = getPhaseDescription(phase);

      // Get next milestone
      const nextMilestone = getNextMilestone(hoursElapsed);

      // Calculate time remaining
      const hoursRemaining = Math.max(0, targetHours - hoursElapsed);
      const timeRemaining = calculateTimeRemaining(hoursRemaining);

      const response: FastingPhaseResponse = {
        phase,
        hoursElapsed: Math.round(hoursElapsed * 10) / 10, // Round to 1 decimal
        targetHours,
        percentComplete,
        nextMilestone,
        phaseDescription,
        timeRemaining,
      };

      return c.json({ data: response }, 200);
    } catch (error) {
      console.error("Fasting phase calculation error:", error);
      return c.json(
        {
          error: {
            message: "Failed to calculate fasting phase",
            code: "PHASE_CALCULATION_ERROR",
          },
        },
        500
      );
    }
  }
);

export { fastingRouter };
