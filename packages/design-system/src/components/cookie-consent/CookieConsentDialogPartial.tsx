import { Headline } from "../headline/HeadlineComponent";
import { Button } from "../button/ButtonComponent";
import { RichText } from "@kickstartds/base/lib/rich-text";
import Markdown from "markdown-to-jsx";
import { Radio } from "@kickstartds/form/lib/radio";
import { CookieConsentProps } from "./CookieConsentProps";
import "./cookie-consent.scss";

type CookieConsentDialogProps = {
  dialog: CookieConsentProps["dialog"];
  open?: boolean;
};

export const CookieConsentDialog = ({
  dialog,
  open,
}: CookieConsentDialogProps) => (
  <dialog open={open} className="dsa-cookie-consent-dialog">
    <div className="dsa-cookie-consent-dialog__header">
      <Headline
        spaceAfter="minimum"
        text={dialog?.title}
        level="h2"
        style="h3"
        className="dsa-cookie-consent-dialog__title"
      />
      <Button
        aria-label="Close Cookie Consent Dialogue"
        className="dsa-cookie-consent-dialog__close"
        icon="close"
        label={""}
        autoFocus
      />
    </div>
    <form className="dsa-cookie-consent-dialog__form" method="dialog">
      <div className="dsa-cookie-consent-dialog__content">
        <RichText
          className="dsa-cookie-consent-dialog__description"
          text={dialog?.description}
        />
        <div className="dsa-cookie-consent-dialog__options">
          {dialog?.required?.map((option, index) => (
            <div
              className="dsa-cookie-consent-dialog__option"
              data-consent-type={option.key}
              key={index}
            >
              <Headline
                spaceAfter="minimum"
                text={option.name}
                level="h3"
                style="h4"
              />
              <Markdown className="dsa-cookie-consent-dialog__option-description">
                {option.description}
              </Markdown>
              <span className="dsa-cookie-consent-dialog__label">
                {dialog?.alwaysActiveLabel || "Always Active"}
              </span>
            </div>
          ))}

          {dialog?.options?.map((option, index) => (
            <div
              className="dsa-cookie-consent-dialog__option"
              data-consent-type={option.key}
              key={index}
            >
              <Headline
                spaceAfter="minimum"
                text={option.name}
                level={"h3"}
                style="h4"
              />
              <Markdown className="dsa-cookie-consent-dialog__option-description">
                {option.description}
              </Markdown>
              <div className="dsa-cookie-consent-dialog__toggle">
                <Radio
                  name={option.key}
                  label={dialog?.toggleLabels?.accept || "Accept"}
                  value="accept"
                />
                <Radio
                  name={option.key}
                  label={dialog?.toggleLabels?.reject || "Reject"}
                  value="reject"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="dsa-cookie-consent-dialog__buttons">
        <Button
          type="button"
          size="small"
          variant={dialog?.decisionButtonVariant}
          label={dialog?.buttons.acceptLabel || "Accept All"}
          className="dsa-cookie-consent-dialog__button--activate-all"
        />
        <Button
          type="button"
          size="small"
          variant={dialog?.decisionButtonVariant}
          label={dialog?.buttons.rejectLabel || "Reject All"}
          className="dsa-cookie-consent-dialog__button--deactivate-all"
        />
        <Button
          type="submit"
          size="small"
          variant="primary"
          label={dialog?.buttons.savePreferencesLabel || "Save Preferences"}
          className="dsa-cookie-consent-dialog__button--save"
        />
      </div>
    </form>
  </dialog>
);
