/*
  The MIT License

  Copyright (c) 2017-2019 EclipseSource Munich
  https://github.com/eclipsesource/jsonforms

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/
import {
  and,
  Categorization,
  deriveLabelForUISchemaElement,
  isVisible,
  RankedTester,
  rankWith,
  StatePropsOfLayout,
  Tester,
  UISchemaElement,
  uiTypeIs,
} from "@jsonforms/core";
import {
  AjvProps,
  MaterialLayoutRenderer,
  MaterialLayoutRendererProps,
  withAjvProps,
} from "@jsonforms/material-renderers";
import { TranslateProps, withJsonFormsLayoutProps, withTranslateProps } from "@jsonforms/react";
import AppBar from "@mui/material/AppBar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "../utils/router";

const isSingleLevelCategorization: Tester = and(
  uiTypeIs("Categorization"),
  (uischema: UISchemaElement): boolean => {
    const categorization = uischema as Categorization;

    return (
      categorization.elements &&
      categorization.elements.reduce((acc, e) => acc && e.type === "Category", true)
    );
  },
);

export const tester: RankedTester = rankWith(2, isSingleLevelCategorization);
export interface CategorizationState {
  activeCategory: number;
}

export interface MaterialCategorizationLayoutRendererProps
  extends StatePropsOfLayout, AjvProps, TranslateProps {
  selected?: number;
  ownState?: boolean;
  data?: any;
  onChange?(selected: number, prevSelected: number): void;
}

export const MaterialCategorizationLayoutRenderer = (
  props: MaterialCategorizationLayoutRendererProps,
) => {
  const searchParams = useSearchParams();
  const {
    data,
    path,
    renderers,
    cells,
    schema,
    uischema,
    visible,
    enabled,
    selected,
    onChange,
    config,
    ajv,
    t,
  } = props;
  const categorization = uischema as Categorization;
  const [previousCategorization, setPreviousCategorization] = useState<Categorization>(
    uischema as Categorization,
  );
  const searchParamValue = searchParams.get(uischema.options?.searchParam);
  const initalCategory = searchParamValue ? Number(searchParamValue) : (selected ?? 0);
  const [activeCategory, setActiveCategory] = useState<number>(initalCategory);
  const categories = useMemo(
    () =>
      categorization.elements.filter((category) =>
        // @ts-expect-error
        isVisible(category, data, undefined, ajv, config),
      ),
    [categorization, data, ajv, config],
  );

  useEffect(() => {
    if (uischema.options?.searchParam) {
      searchParams.set(uischema.options.searchParam, String(activeCategory));
    }
  }, [uischema, activeCategory]);
  useEffect(() => {
    if (searchParamValue) {
      setActiveCategory(Number(searchParamValue));
    }
  }, [searchParamValue]);

  if (categorization !== previousCategorization) {
    setActiveCategory(0);
    setPreviousCategorization(categorization);
  }

  const safeCategory = activeCategory >= categorization.elements.length ? 0 : activeCategory;

  const childProps: MaterialLayoutRendererProps = {
    elements: categories[safeCategory] ? categories[safeCategory].elements : [],
    schema,
    path,
    direction: "column",
    enabled,
    visible,
    renderers,
    cells,
  };
  const onTabChange = (_event: any, value: any) => {
    if (onChange) {
      onChange(value, safeCategory);
    }
    setActiveCategory(value);
  };

  const tabLabels = useMemo(() => {
    return categories.map((e) => deriveLabelForUISchemaElement(e, t));
  }, [categories, t]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Tabs
          value={safeCategory}
          onChange={onTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
        >
          {categories.map((_, idx: number) => (
            <Tab key={idx} label={tabLabels[idx]} />
          ))}
        </Tabs>
      </AppBar>
      <div style={{ padding: "12px 16px" }}>
        <MaterialLayoutRenderer {...childProps} key={safeCategory} />
      </div>
    </>
  );
};

export const renderer = withAjvProps(
  withTranslateProps(withJsonFormsLayoutProps(MaterialCategorizationLayoutRenderer)),
);
