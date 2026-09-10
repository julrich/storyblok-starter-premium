import { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { CookieConsent, CookieConsentProps } from "./CookieConsentComponent";
import customProperties from "./cookie-consent-tokens.json";
import schema from "./cookie-consent.schema.dereffed.json";

import { define } from "@kickstartds/core/lib/component";
import { configureConsentManager, createConsentManagerStore } from "c15t";
import { baseTranslations } from "@c15t/translations";
import { Button } from "../button/ButtonComponent";
import CookieConsentC15t from "./C15t.client";

const PureCookieConsent = (props: CookieConsentProps) => {
  useEffect(() => {
    window._ks.radio.emit("dsa.cookie-consent.showNotice", true);
  }, []);
  return <CookieConsent {...props} />;
};

const meta: Meta = {
  title: "Corporate/Cookie Consent",
  component: CookieConsent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
  render(args) {
    return <PureCookieConsent {...args} />;
  },
};

export default meta;

type Story = StoryObj<typeof CookieConsent>;

export const Card: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 472,
    },
  },
  args: pack({
    notice: {
      displayMode: "card",
      title: "We use cookies",
      description:
        "We use cookies to enhance your experience on our website. You can choose which cookies to accept.",
      acceptButton: {
        label: "Accept All",
      },
      rejectButton: {
        label: "Reject All",
      },
      decisionButtonVariant: "primary",
      customizeButton: {
        label: "Customize",
        variant: "tertiary",
      },
    },
    dialog: {
      title: "Cookie Preferences",
      description: "Manage your cookie preferences below.",
      required: [
        {
          key: "necessary",
          name: "Essential Cookies",
          description:
            "These cookies are necessary for the website to function.",
        },
      ],
      options: [
        {
          key: "measurement",
          name: "Analytics Cookies",
          description:
            "These cookies help us understand how our visitors interact with the website.",
        },
        {
          key: "marketing",
          name: "Marketing Cookies",
          description:
            "These cookies are used to deliver advertisements that are relevant to you.",
        },
        {
          key: "functionality",
          name: "Functional Cookies",
          description:
            "These cookies allow the website to remember choices you make and provide enhanced, more personal features.",
        },
        {
          key: "experience",
          name: "Performance Cookies",
          description:
            "These cookies collect information about how visitors use the website, such as which pages are visited most often and if they get error messages from web pages.",
        },
      ],
    },
  }),
};

export const Banner: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 472,
    },
  },
  args: pack({
    notice: {
      displayMode: "banner",
      title: "Your Privacy Matters to Us",
      description:
        "We use cookies and similar technologies to personalize content, provide social media features, and analyze our traffic. You can choose which categories you want to allow and change your preferences at any time. For more information, please see our privacy policy.",
      decisionButtonVariant: "tertiary",
      acceptButton: {
        label: "Accept All Cookies",
      },
      customizeButton: {
        label: "Customize Settings",
        variant: "secondary",
      },
      rejectButton: {
        label: "Reject Non-Essential",
      },
    },
    dialog: {
      title: "Manage Your Cookie Preferences",
      description:
        "Here you can enable or disable different types of cookies. Essential cookies are always active as they are necessary for the website to function properly. You can change your preferences at any time. Please note that disabling certain cookies may affect your experience on our website.",
      required: [
        {
          name: "Essential Cookies",
          description:
            "These cookies are required for basic website functionality, such as page navigation and access to secure areas of the website. The website cannot function properly without these cookies.",
        },
      ],
      decisionButtonVariant: "tertiary",
      options: [
        {
          name: "Statistics Cookies",
          description:
            "These cookies help us to understand how visitors interact with our website by collecting and reporting information anonymously.",
        },
        {
          name: "Personalization Cookies",
          description:
            "These cookies allow the website to remember choices you make, such as your language or region, to provide a more personalized experience.",
        },
        {
          name: "Advertising Cookies",
          description:
            "Advertising cookies are used to deliver relevant ads and marketing campaigns to you. They track visitors across websites and collect information to provide customized ads.",
        },
      ],
    },
  }),
};

const c15cStore = createConsentManagerStore(
  configureConsentManager({ mode: "offline" }),
  {
    initialTranslationConfig: {
      translations: baseTranslations,
      disableAutoLanguageSwitch: false,
    },
    ignoreGeoLocation: true, // Useful for development to always view the banner.
  }
);
define(
  "dsa.cookie-consent.c15t.offline",
  class extends CookieConsentC15t {
    static store = c15cStore;
  }
);

export const C15t: Story = {
  parameters: Card.parameters,
  args: pack({
    notice: {
      displayMode: "card",
      decisionButtonVariant: "primary",
      customizeButton: { variant: "tertiary" },
    },
    dialog: {
      required: [{ key: "necessary" }],
      options: [
        { key: "measurement" },
        { key: "marketing" },
        { key: "functionality" },
        { key: "experience" },
      ],
    },
    component: "dsa.cookie-consent.c15t.offline",
  }),
  render(args) {
    return (
      <>
        <Button
          size="small"
          label="reset"
          onClick={() => {
            const state = c15cStore.getState();
            state.resetConsents();
            state.setShowPopup(true);
          }}
        />
        <hr />
        <CookieConsent {...args} />
      </>
    );
  },
};
