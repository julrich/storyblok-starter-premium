/**
 * Panel 1: Content Type List
 *
 * Shows all 7 content types with override counts.
 * Selecting a content type populates Panel 2.
 */

import type { ContentTypeInfo, ContentTypeName } from "../../shared/types.js";
import { useOverrides } from "../hooks/useOverrides.js";
import { componentHasOverrides } from "../lib/override-model.js";

interface ContentTypeListProps {
  contentTypes: ContentTypeInfo[];
  selectedType: ContentTypeName | null;
  onSelect: (name: ContentTypeName) => void;
}

export function ContentTypeList({
  contentTypes,
  selectedType,
  onSelect,
}: ContentTypeListProps) {
  const { overrides } = useOverrides();

  return (
    <div className="panel panel-content-types">
      <div className="panel-header">Content Types</div>
      <ul className="content-type-list">
        {contentTypes.map((ct) => {
          // Count components/root fields with overrides for this content type
          const overrideCount = countOverridesForContentType(ct, overrides);
          const totalCount =
            ct.rootFields.length +
            ct.sectionComponents.length +
            (ct.hasSections ? 1 : 0);

          return (
            <li
              key={ct.name}
              className={`content-type-item ${
                selectedType === ct.name ? "active" : ""
              }`}
              onClick={() => onSelect(ct.name)}
            >
              <span className="content-type-name">{ct.name}</span>
              {overrideCount > 0 && (
                <span className="content-type-badge">
                  {overrideCount}/{totalCount}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function countOverridesForContentType(
  ct: ContentTypeInfo,
  allOverrides: Map<string, Map<string, unknown>>
): number {
  let count = 0;

  // Check section component
  if (ct.hasSections && componentHasOverrides(allOverrides as any, "section")) {
    count++;
  }

  // Check root fields (stored under content type name prefix)
  for (const rf of ct.rootFields) {
    const key = `${ct.name}::${rf.name}`;
    if (componentHasOverrides(allOverrides as any, key)) {
      count++;
    }
  }

  // Check content components
  for (const compName of ct.sectionComponents) {
    if (componentHasOverrides(allOverrides as any, compName)) {
      count++;
    }
  }

  return count;
}
