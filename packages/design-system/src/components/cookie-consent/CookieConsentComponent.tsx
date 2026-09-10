import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { CookieConsentDialog } from "./CookieConsentDialogPartial";
import classnames from "classnames";
import { CookieConsentProps } from "./CookieConsentProps";
import "./cookie-consent.scss";
import { Headline } from "../headline/HeadlineComponent";
import { Button } from "../button/ButtonComponent";
import { RichText } from "@kickstartds/base/lib/rich-text";
import "./CookieConsent.client";

export type { CookieConsentProps };

export const CookieConsentContextDefault = forwardRef<
  HTMLDivElement,
  CookieConsentProps & HTMLAttributes<HTMLDivElement>
>(
  (
    { notice, revisitButton, dialog, component = "dsa.cookie-consent" },
    ref
  ) => {
    return (
      <div className="dsa-cookie-consent" ks-component={component} ref={ref}>
        <div
          className={classnames(
            `dsa-cookie-consent-notice dsa-cookie-consent-notice--${notice?.displayMode}`
          )}
          hidden
        >
          <Headline
            spaceAfter="minimum"
            text={notice?.title}
            level="h2"
            style="h3"
            className="dsa-cookie-consent-notice__title"
          />
          <RichText
            text={notice?.description}
            className="dsa-cookie-consent-notice__description"
          />
          <div className="dsa-cookie-consent-notice__buttons">
            <Button
              size="small"
              label={notice?.customizeButton?.label}
              variant={notice?.customizeButton?.variant}
              className="dsa-cookie-consent-notice__button--customize"
            />
            <Button
              size="small"
              label={notice?.rejectButton?.label}
              variant={notice?.decisionButtonVariant}
              className="dsa-cookie-consent-notice__button--reject"
            />
            <Button
              size="small"
              label={notice?.acceptButton?.label}
              variant={notice?.decisionButtonVariant}
              className="dsa-cookie-consent-notice__button--accept"
            />
          </div>
        </div>

        <Button
          className="dsa-cookie-consent-revisit"
          size="small"
          variant="primary"
          icon="star"
          label={revisitButton?.label || "Cookie Preferences"}
          hidden
        />

        <CookieConsentDialog dialog={dialog} />
      </div>
    );
  }
);

export const CookieConsentContext = createContext(CookieConsentContextDefault);
export const CookieConsent = forwardRef<
  HTMLDivElement,
  CookieConsentProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(CookieConsentContext);
  return <Component {...props} ref={ref} />;
});
CookieConsent.displayName = "CookieConsent";
