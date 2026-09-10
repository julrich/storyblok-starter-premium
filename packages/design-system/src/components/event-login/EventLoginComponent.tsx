import { createContext, forwardRef, useContext } from "react";
import { EventLoginProps } from "./EventLoginProps";
import "./event-login.scss";
import { Headline } from "../headline/HeadlineComponent";
import { Link } from "@kickstartds/base/lib/link";
import { TextField } from "@kickstartds/form/lib/text-field";
import { Button } from "../button/ButtonComponent";
import Markdown from "markdown-to-jsx";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventLoginDefaults";

export type { EventLoginProps };

export const EventLoginContextDefault = forwardRef<
  HTMLDivElement,
  EventLoginProps
>(
  (
    { headline, text, usernameInput, passwordInput, cta, resetPassword },
    ref
  ) => (
    <div ref={ref} className="dsa-event-login">
      <Headline spaceAfter="minimum" text={headline} level={"h2"} />
      <Markdown className="dsa-event-login__text">{text}</Markdown>

      <form className="dsa-event-login__form">
        <div className="dsa-event-login__inputs">
          <TextField
            label={usernameInput.label}
            placeholder={usernameInput?.placeholder}
          />

          <TextField
            type="password"
            label={passwordInput.label}
            placeholder={passwordInput?.placeholder}
          />
        </div>

        <div className="dsa-event-login__actions">
          <Link className="dsa-event-login__link" href={resetPassword?.url}>
            {resetPassword?.label || "Forgot your password?"}
          </Link>
          <Button
            label={cta.label}
            url={cta.url}
            aria-label={cta?.ariaLabel}
            variant="primary"
            size="small"
          />
        </div>
      </form>
    </div>
  )
);

export const EventLoginContext = createContext(EventLoginContextDefault);
export const EventLogin = forwardRef<HTMLDivElement, EventLoginProps>(
  (props, ref) => {
    const Component = useContext(EventLoginContext);
    return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
  }
);
EventLogin.displayName = "EventLogin";
