// biome-ignore lint/performance/noNamespaceImport: biome ignore
import * as Dialog from "@radix-ui/react-dialog";
// biome-ignore lint/performance/noNamespaceImport: biome ignore
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cx } from "class-variance-authority";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type { Header } from "sanity.types";
import { CountrySelectorDialog } from "@/components/global/header/country-selector-dialog";
import { ButtonLink } from "@/components/shared/button";
import { LocalizedLink } from "@/components/shared/localized-link";
import { SanityImage } from "@/components/shared/sanity-image";
import { Body } from "@/components/shared/typography/body";
import { Heading } from "@/components/shared/typography/heading";
import { Label } from "@/components/shared/typography/label";
import { Icon } from "@/generated/Icon";
import {
  ACCORDION_LEFT,
  ACCORDION_RIGHT,
  CLOSE,
  HAMBURGER,
} from "@/generated/icons";
import type { Country } from "@/lib/medusa/regions";

type DropdownType = Extract<
  NonNullable<Header["navigation"]>[number],
  { _type: "dropdown" }
>;

export function Hamburger({
  data,
  countries,
}: {
  data: Header;
  countries: Country[];
}) {
  const [open, setOpen] = useState(false);
  const [activeMenuState, setActiveMenu] = useState<string | undefined>(
    undefined
  );

  const portalContainer =
    typeof document === "undefined"
      ? null
      : document.getElementById("navigation-portal");

  const isMenuActive = data.navigation?.some(
    (menu) => menu._key === activeMenuState && menu._type === "dropdown"
  );
  const activeMenu: any = data.navigation?.find(
    (menu) => menu._key === activeMenuState && menu._type === "dropdown"
  );

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger
        aria-label="Menu"
        className="shrink-0 lg:hidden"
        onClick={() => setActiveMenu(undefined)}
      >
        {open ? (
          <Icon className="size-lg" href={CLOSE} />
        ) : (
          <Icon className="size-lg" href={HAMBURGER} />
        )}
      </Dialog.Trigger>
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay className="absolute inset-0" />
        <Dialog.Content className="relative min-h-[calc(100dvh-var(--header-height))] w-screen overflow-x-hidden bg-background">
          <VisuallyHidden.Root>
            <Dialog.Title>Menu</Dialog.Title>
            <Dialog.Description>Menu</Dialog.Description>
          </VisuallyHidden.Root>
          <div
            className={cx(
              "scrollbar-hide absolute top-0 left-0 flex w-screen flex-1 flex-col items-start justify-between overflow-x-hidden overflow-y-scroll bg-background transition-all duration-300",
              {
                "-translate-x-full": isMenuActive,
                "translate-x-0": !isMenuActive,
              }
            )}
          >
            <div className="flex h-auto w-full flex-col">
              {data.navigation?.map((item) => (
                <NavMenuItem
                  item={item}
                  key={item._key}
                  setActiveMenu={setActiveMenu}
                  setOpen={setOpen}
                />
              ))}
            </div>
            {/* Country Selector */}
            <div className="p-m">
              <CountrySelectorDialog countries={countries} />
            </div>
          </div>
          <div
            className={`scrollbar-hide absolute top-0 left-0 w-screen transform overflow-x-hidden overflow-y-scroll bg-background transition-all duration-300 ${
              isMenuActive ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="h-auto w-full">
              <button
                className="flex items-center justify-start gap-s p-m"
                onClick={() => setActiveMenu(undefined)}
                type="button"
              >
                <Icon className="size-8" href={ACCORDION_LEFT} />
                <Body font="sans" mobileSize="2xl">
                  {activeMenu?.title}
                </Body>
              </button>
              <DropdownList activeMenu={activeMenu} setOpen={setOpen} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NavMenuItem({
  item,
  setActiveMenu,
  setOpen,
}: {
  item: NonNullable<Header["navigation"]>[number];
  setActiveMenu: (key: string) => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  if (item._type === "link") {
    return (
      <>
        {item.cta?.link ? (
          <LocalizedLink
            className="p-m"
            href={item.cta?.link}
            onClick={() => setOpen(false)}
          >
            <Body font="sans" mobileSize="2xl">
              {item.cta?.label}
            </Body>
          </LocalizedLink>
        ) : null}
      </>
    );
  }

  if (item._type === "dropdown") {
    return (
      <button
        className="flex items-center justify-between p-m"
        key={item._key}
        onClick={() => setActiveMenu(item._key)}
        type="button"
      >
        <Body font="sans" mobileSize="2xl">
          {item.title}
        </Body>
        <Icon className="size-8" href={ACCORDION_RIGHT} />
      </button>
    );
  }
  return null;
}

function DropdownList({
  activeMenu,
  setOpen,
}: {
  activeMenu: DropdownType;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="flex h-full w-full flex-col items-start gap-xl pb-lg">
      {activeMenu?.columns?.map((item) => (
        <div
          className="flex flex-col items-start justify-start gap-s px-m"
          key={item._key}
        >
          <Body font="sans" mobileSize="base">
            {item.title}
          </Body>
          {item.links?.map((link) => {
            if (!link.link) {
              return null;
            }
            return (
              <LocalizedLink
                className="flex w-full items-start justify-start gap-2 py-1"
                href={link.link}
                key={link._key}
                onClick={() => setOpen(false)}
              >
                <Label className="font-medium" font="sans" mobileSize="2xl">
                  {link.label}
                </Label>
              </LocalizedLink>
            );
          })}
        </div>
      ))}
      <div className="scrollbar-hide flex w-full gap-xs overflow-x-scroll">
        {activeMenu?.cards?.map((card) => (
          <div
            className="flex w-55 min-w-40 max-w-55 shrink-0 flex-col items-center gap-xs rounded-lg first:ml-m last:mr-m"
            key={card._key}
          >
            {card.image ? (
              <SanityImage
                className="aspect-square max-h-55 w-55 min-w-40 rounded-lg"
                data={card.image}
              />
            ) : (
              <div className="aspect-square w-full rounded-lg bg-accent" />
            )}

            <Heading
              className="text-center"
              font="serif"
              mobileSize="xs"
              tag="h5"
            >
              {card.title}
            </Heading>
            {card.cta?.link ? (
              <ButtonLink
                className="mt-xs"
                href={card.cta?.link}
                size="sm"
                variant="outline"
              >
                {card.cta?.label}
              </ButtonLink>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
