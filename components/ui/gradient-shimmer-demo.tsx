import { GradientShimmer } from "@/components/ui/gradient-shimmer";

const settings = {
  gradient: "sunrise",
  easing: "smooth",
  duration: 1.45,
  spread: 3,
  angle: 105,
  pauseBetween: 1000,
};

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <GradientShimmer
        gradient={s.gradient as any}
        easing={s.easing as any}
        duration={s.duration}
        spread={s.spread}
        angle={s.angle}
        pauseBetween={s.pauseBetween}
        className="text-5xl font-semibold tracking-tight sm:text-7xl"
      >
        Gradient Shimmer
      </GradientShimmer>
    </div>
  );
}
