/** Visual language for entity types. Colors are deliberately desaturated so highlighted
 * text stays readable; the same mapping is used everywhere (document reading view,
 * legends, charts, badges) so a person learns it once. Types not listed fall back to
 * `default` — the backend's label map can introduce types this list doesn't yet know
 * about, and that must never break rendering. */
export interface EntityStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const PALETTE: Record<string, EntityStyle> = {
  Disease:         { bg: "#FBEDEE", text: "#8A2A2E", border: "#EFC9CB", dot: "#B23A3F" },
  Symptom:         { bg: "#FBF3E7", text: "#7A4A08", border: "#EFD9B3", dot: "#B4680B" },
  Medication:      { bg: "#EAF7F4", text: "#0C5A4E", border: "#BFE6DC", dot: "#0F8A78" },
  Procedure:       { bg: "#EAF3FC", text: "#144A80", border: "#C3DBF3", dot: "#1D5FA8" },
  Test:            { bg: "#EAF3FC", text: "#144A80", border: "#C3DBF3", dot: "#1D5FA8" },
  LabValue:        { bg: "#F2EEFB", text: "#4A2C87", border: "#DCCFF2", dot: "#6D3FC7" },
  Anatomy:         { bg: "#F1F4F9", text: "#3D4A66", border: "#DCE3EF", dot: "#5B6B8C" },
  Dosage:          { bg: "#EAF7F4", text: "#0C5A4E", border: "#BFE6DC", dot: "#0F8A78" },
  Frequency:       { bg: "#EAF7F4", text: "#0C5A4E", border: "#BFE6DC", dot: "#0F8A78" },
  Duration:        { bg: "#EAF7F4", text: "#0C5A4E", border: "#BFE6DC", dot: "#0F8A78" },
  Administration:  { bg: "#EAF7F4", text: "#0C5A4E", border: "#BFE6DC", dot: "#0F8A78" },
  Age:             { bg: "#F1F4F9", text: "#3D4A66", border: "#DCE3EF", dot: "#5B6B8C" },
  Sex:             { bg: "#F1F4F9", text: "#3D4A66", border: "#DCE3EF", dot: "#5B6B8C" },
  Severity:        { bg: "#FBF3E7", text: "#7A4A08", border: "#EFD9B3", dot: "#B4680B" },
};

const DEFAULT_STYLE: EntityStyle = { bg: "#EEF2FC", text: "#24408F", border: "#D6E0F7", dot: "#3E5CB8" };

export function entityStyle(entityType: string): EntityStyle {
  return PALETTE[entityType] ?? DEFAULT_STYLE;
}

export const KNOWN_ENTITY_TYPES = Object.keys(PALETTE);
