export enum QuestionType {
  TEXT = "text",
  NUMERIC = "integer",
  DECIMAL = "decimal",
  DATE = "date",
  TIME = "time",
  DATETIME = "dateTime",
  SELECT_ONE = "select_one",
  SELECT_MULTIPLE = "select_multiple",
  GPS = "geopoint",
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  BARCODE = "barcode",
  CALCULATE = "calculate",
  NOTE = "note",
  GROUP = "group",
  REPEAT = "repeat",
}

export interface Choice {
  id: string;
  name: string;
  label: string;
}

export interface FormElement {
  id: string;
  type: QuestionType;
  name: string;
  label: string;
  hint?: string;
  description?: string;
  required?: boolean;
  choices?: Choice[];
  constraint?: string;
  relevant?: string;
  calculation?: string;
  appearance?: string;
  constraint_message?: string;
  repeat_count?: string;
  mediaSrc?: string | ArrayBuffer | null;
  children?: FormElement[];
}

export interface Project {
  id: string;
  title: string;
  language: string;
  elements: FormElement[];
  createdAt: string;
  updatedAt: string;
  endOfFormMessage?: string;
}

export interface FormTemplate {
    id: string;
    title: string;
    description: string;
    category: string;
    categoryKey: string;
    elements: Partial<FormElement>[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    profession?: string;
}
