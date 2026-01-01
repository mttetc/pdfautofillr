import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
  Button,
  Kbd,
  Link as HeroUILink,
  Input,
} from "@heroui/react";
import { link as linkStyles } from "@heroui/theme";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  TwitterIcon,
  GithubIcon,
  DiscordIcon,
  SearchIcon,
  Logo,
} from "@/components/icons";

export const Navbar = () => {
  const searchInput = (
    <Input
      aria-label="Search"
      classNames={{
        inputWrapper: "bg-default-100",
        input: "text-sm",
      }}
      endContent={
        <Kbd className="hidden lg:inline-block" keys={["command"]}>
          K
        </Kbd>
      }
      labelPlacement="outside"
      placeholder="Search..."
      startContent={
        <SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
      }
      type="search"
    />
  );

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <Link className="flex justify-start items-center gap-1" to="/">
            <Logo />
            <p className="font-bold text-inherit">PDF AutoFillr</p>
          </Link>
        </NavbarBrand>
        <ul className="hidden lg:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <Link
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium"
                )}
                to={item.href}
              >
                {item.label}
              </Link>
            </NavbarItem>
          ))}
        </ul>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex gap-2">
          <HeroUILink
            isExternal
            aria-label="Twitter"
            href={siteConfig.links.twitter}
          >
            <TwitterIcon className="text-default-500" />
          </HeroUILink>
          <HeroUILink
            isExternal
            aria-label="Discord"
            href={siteConfig.links.discord}
          >
            <DiscordIcon className="text-default-500" />
          </HeroUILink>
          <HeroUILink
            isExternal
            aria-label="Github"
            href={siteConfig.links.github}
          >
            <GithubIcon className="text-default-500" />
          </HeroUILink>
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem className="hidden lg:flex">{searchInput}</NavbarItem>
        <NavbarItem className="hidden md:flex">
          <Button
            as={Link}
            className="text-sm font-normal text-default-600 bg-default-100"
            to="/dashboard"
            variant="flat"
          >
            New PDF
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <HeroUILink
          isExternal
          aria-label="Github"
          href={siteConfig.links.github}
        >
          <GithubIcon className="text-default-500" />
        </HeroUILink>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        {searchInput}
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig.navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link
                className={clsx(
                  "text-lg",
                  index === 2
                    ? "text-primary"
                    : index === siteConfig.navMenuItems.length - 1
                      ? "text-danger"
                      : "text-foreground"
                )}
                to={item.href}
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
