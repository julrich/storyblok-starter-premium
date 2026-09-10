import { FC } from "react";
import { Section } from "../section/SectionComponent";
import { Button } from "../button/ButtonComponent";
import { SearchForm } from "../search-form/SearchFormComponent";
import "./SearchModal.client";
import "./search-modal.scss";
import { SearchModalProps } from "./SearchModalProps";

export const SearchModal: FC<SearchModalProps> = ({
  headline = "Search",
  closeAriaLabel = "close",
  form: formProps = {},
}) => (
  <dialog ks-component="dsa.search-modal" className="dsa-search-modal">
    <Section
      headline={{
        text: headline,
        sub: closeAriaLabel,
        // @ts-expect-error
        renderSubheadline(sub: string) {
          return (
            <Button
              className="dsa-search-modal__close"
              aria-label={sub}
              label=""
              icon="close"
              size="small"
              ks-component="dsa.radio-emit"
              data-topic="dsa.search-modal.close"
            />
          );
        },
      }}
      spaceBefore="small"
      spaceAfter="small"
    >
      <SearchForm {...formProps} />
    </Section>
  </dialog>
);
