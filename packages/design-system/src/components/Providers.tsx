import { PropsWithChildren } from "react";
import { Decorator } from "@storybook/react";
import { ButtonProvider } from "./button/ButtonComponent";
import { SectionProvider } from "./section/SectionComponent";
import { TeaserBoxProvider } from "./teaser-card/TeaserCardComponent";
import { ContactProvider } from "./contact/ContactComponent";
import { HeadlineProvider } from "./headline/HeadlineComponent";
import { BedrockProvider } from "../bedrock/BedrockProvider";
import { ButtonGroupProvider } from "./button-group/ButtonGroupComponent";
import { CheckboxProvider } from "./checkbox/CheckboxComponent";
import { CheckboxGroupProvider } from "./checkbox-group/CheckboxGroupComponent";
import { RadioProvider } from "./radio/RadioComponent";
import { RadioGroupProvider } from "./radio-group/RadioGroupComponent";
import { SelectFieldProvider } from "./select-field/SelectFieldComponent";
import { TextAreaProvider } from "./text-area/TextAreaComponent";
import { TextFieldProvider } from "./text-field/TextFieldComponent";

const Providers = (props: PropsWithChildren) => (
  <BedrockProvider>
    <ButtonProvider>
      <CheckboxProvider>
        <CheckboxGroupProvider>
          <RadioProvider>
            <RadioGroupProvider>
              <SelectFieldProvider>
                <TextAreaProvider>
                  <TextFieldProvider>
                    <ContactProvider>
                      <ButtonGroupProvider>
                        <HeadlineProvider>
                          <SectionProvider>
                            <TeaserBoxProvider {...props} />
                          </SectionProvider>
                        </HeadlineProvider>
                      </ButtonGroupProvider>
                    </ContactProvider>
                  </TextFieldProvider>
                </TextAreaProvider>
              </SelectFieldProvider>
            </RadioGroupProvider>
          </RadioProvider>
        </CheckboxGroupProvider>
      </CheckboxProvider>
    </ButtonProvider>
  </BedrockProvider>
);

export default Providers;

export const providerDecorator: Decorator = (storyFn, context) => (
  <Providers>{storyFn(context)}</Providers>
);
