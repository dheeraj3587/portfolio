import { EmojiSpreeChips } from "@/components/ui/emoji-spree-choice-chips";
import { interests } from "@/lib/portfolio-data";
import { Reveal } from "./reveal";

export function InterestsSection() {
  return (
    <Reveal delay={100} className="mt-14">
      <section id="interests">
        <EmojiSpreeChips interests={interests} />
      </section>
    </Reveal>
  );
}
