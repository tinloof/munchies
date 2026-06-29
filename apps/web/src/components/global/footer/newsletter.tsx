import { actions } from "astro:actions";
import { withState } from "@astrojs/react/actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Footer as FooterType } from "sanity.types";
import { Cta } from "@/components/shared/button";
import { Body } from "@/components/shared/typography/body";
import { Heading } from "@/components/shared/typography/heading";

interface NewsLetterProps extends FooterType {
  copyNode?: React.ReactNode;
  footnoteNode?: React.ReactNode;
  successNode?: React.ReactNode;
  errorNode?: React.ReactNode;
}

export function NewsLetter(props: NewsLetterProps) {
  const [state, action] = useActionState(
    withState(actions.subscribeToNewsletter),
    {
      data: "",
      error: undefined,
    }
  );

  return (
    <section className="mx-auto flex w-full max-w-max-screen flex-col gap-s px-m py-2xl lg:px-xl">
      {state.data === "success" && (
        <Body desktopSize="8xl" font="serif" mobileSize="5xl">
          {props.successNode}
        </Body>
      )}
      {state.data !== "success" && (
        <>
          <Heading desktopSize="5xl" font="serif" mobileSize="2xl" tag="h2">
            {props.copyNode}
          </Heading>
          <form
            action={action}
            className="flex flex-col gap-s lg:flex-row"
          >
            <input
              className="newletter-text h-20 w-full max-w-240 rounded-lg border-[1.5px] border-accent bg-transparent px-lg py-[7.5px] font-sans text-body-4xl leading-[140%] tracking-[-0.64px] outline-none placeholder:text-accent placeholder:text-body-4xl placeholder:opacity-60 lg:px-2xl lg:py-[6.5px] lg:text-body-8xl lg:tracking-[-0.96px] lg:placeholder:text-body-8xl"
              name="email"
              placeholder={props.placeholder}
              required
              type="email"
            />
            <SubmitButton text={props.button} />
          </form>
          <Body font="sans" mobileSize="sm">
            {props.footnoteNode}
          </Body>
        </>
      )}
      {state.error && (
        <div className="rounded-lg bg-error/20 p-s">
          <Body
            className="text-error"
            desktopSize="2xl"
            font="sans"
            mobileSize="lg"
          >
            {props.errorNode}
          </Body>
        </div>
      )}
    </section>
  );
}
function SubmitButton({ text }: { text?: string }) {
  const { pending } = useFormStatus();

  return (
    <Cta
      className="w-full lg:flex-1"
      loading={pending}
      size="xl"
      type="submit"
      variant="outline"
    >
      {text || "Submit"}
    </Cta>
  );
}
