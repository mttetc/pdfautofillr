import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { button as buttonStyles } from "@heroui/theme";
import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>AI-powered&nbsp;</span>
        <span className={title({ color: "violet" })}>PDF Autofill&nbsp;</span>
        <br />
        <span className={title()}>tool for instant form completion.</span>
        <div className={subtitle({ class: "mt-4" })}>
          Upload your PDF and let AI handle the rest.
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          className={buttonStyles({
            color: "primary",
            radius: "full",
            variant: "shadow",
          })}
          to="/dashboard"
        >
          Get Started
        </Link>
        <a
          className={buttonStyles({ variant: "bordered", radius: "full" })}
          href={siteConfig.links.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubIcon size={20} />
          GitHub
        </a>
      </div>
    </section>
  );
}
