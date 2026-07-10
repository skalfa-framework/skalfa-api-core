import validator from "validator"
import { db } from "@skalfa/skalfa-orm";
import { getLang } from "@skalfa/skalfa-lang";



// ==========================>
// ## Validation: Rules of validation
// ==========================>
export type ValidationRule =
  | "required"
  | "string"
  | "numeric"
  | "number"
  | "boolean"
  | "email"
  | "url"
  | "date"
  | "confirmed"
  | "array"
  | `min:`
  | `min:${number}`
  | `max:`
  | `max:${number}`
  | `between:`
  | `between:${number},${number}`
  | `in:`
  | `in:${string}`
  | `not_in:`
  | `not_in:${string}`
  | `same:`
  | `same:${string}`
  | `different:`
  | `different:${string}`
  | `regex:`
  | `regex:${string}`
  | `unique:`
  | `unique:${string},${string}`
  | `exists:`
  | `exists:${string},${string}`

export type ValidationRules = Record<string, ValidationRule[] | string>

export interface ValidationResult {
  valid  : boolean
  errors : Record<string, string[]>
}



// =====================================>
// ## Validation: validate request data
// =====================================>
export async function validate(
  data   :  Record<string, any>,
  rules  :  ValidationRules
): Promise<ValidationResult> {
  const errors: Record<string, string[]> = {}

  for (const field in rules) {
    const fieldRules = normalizeRules(rules[field])

    if (field.includes("*")) {
      const segments = field.split(".")

      await nestedValidation({ value: data, segments, rules: fieldRules, fieldPath: "", data, errors })

      continue
    }

    const value = getNestedValue(data, field) ?? ""

    await checkRules({ field, value, rules: fieldRules, data, errors })
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}


async function checkRules({ field, value, rules, data, errors } : { field: string, value: any, rules: ValidationRule[], data: any, errors: Record<string, string[]> }) {
  const l = getLang();
  for (const rule of rules) {
    const [name, param] = rule.split(":") as [string, string | undefined]

    switch (name) {
      // === BASIC ===
      case "required":
        if (validator.isEmpty(String(value).trim())) {
          const msg = l.validation?.required ? l.validation.required() : `${field} wajib diisi`;
          addError(errors, field, msg);
        }
        break

      case "string":
      case "text":
        if (!value) break
        if (typeof value !== "string") {
          const msg = l.validation?.string ? l.validation.string() : `${field} harus berupa string`;
          addError(errors, field, msg);
        }
        break

      case "numeric":
      case "number":
        if (!value) break
        if (!validator.isNumeric(String(value))) {
          const msg = l.validation?.numeric ? l.validation.numeric() : `${field} harus berupa angka`;
          addError(errors, field, msg);
        }
        break

      case "boolean":
        if (!(value === true || value === false || value === "true" || value === "false" || value === 1 || value === 0)) {
          const msg = l.validation?.boolean ? l.validation.boolean() : `${field} harus berupa boolean`;
          addError(errors, field, msg);
        }
        break

      case "email":
        if (!value) break
        if (!validator.isEmail(String(value))) {
          const msg = l.validation?.email ? l.validation.email() : `${field} harus berupa email yang valid`;
          addError(errors, field, msg);
        }
        break

      case "url":
        if (!value) break
        if (!validator.isURL(String(value))) {
          const msg = l.validation?.url ? l.validation.url() : `${field} harus berupa URL yang valid`;
          addError(errors, field, msg);
        }
        break

      case "date":
        if (!value) break
        if (!validator.isDate(String(value))) {
          const msg = l.validation?.date ? l.validation.date() : `${field} harus berupa tanggal yang valid`;
          addError(errors, field, msg);
        }
        break

      // === LENGTH ===
      case "min": {
        if (!value) break
        const min = parseInt(param!)
        if (!validator.isLength(String(value), { min })) {
          const msg = l.validation?.min ? l.validation.min({ min }) : `${field} minimal ${min} karakter`;
          addError(errors, field, msg);
        }
        break
      }

      case "max": {
        if (!value) break
        const max = parseInt(param!)
        if (!validator.isLength(String(value), { max })) {
          const msg = l.validation?.max ? l.validation.max({ max }) : `${field} maksimal ${max} karakter`;
          addError(errors, field, msg);
        }
        break
      }

      case "between": {
        if (!value) break
        const [minVal, maxVal] = param!.split(",").map(Number)
        if (!validator.isLength(String(value), { min: minVal, max: maxVal })) {
          const msg = l.validation?.min_max ? l.validation.min_max({ min: minVal, max: maxVal }) : `${field} harus antara ${minVal} - ${maxVal} karakter`;
          addError(errors, field, msg);
        }
        break
      }

      // === SET MEMBERSHIP ===
      case "in": {
        if (!value) break
        const allowed = param!.split(",")
        if (!allowed.includes(String(value))) {
          const msg = l.validation?.in ? l.validation.in({ keywords: allowed.join(", ") }) : `${field} harus salah satu dari: ${allowed.join(", ")}`;
          addError(errors, field, msg);
        }
        break
      }

      case "not_in": {
        if (!value) break
        const notAllowed = param!.split(",")
        if (notAllowed.includes(String(value))) {
          const msg = l.validation?.not_in ? l.validation.not_in({ keywords: notAllowed.join(", ") }) : `${field} tidak boleh salah satu dari: ${notAllowed.join(", ")}`;
          addError(errors, field, msg);
        }
        break
      }

      case "array": {
        if (!value) break
        if (!Array.isArray(value)) {
          const msg = l.validation?.array ? l.validation.array() : `${field} harus berupa array`;
          addError(errors, field, msg);
        }
        break
      }

      // === RELATIONAL ===
      case "confirmed":
        if (value !== getNestedValue(data, `${field}_confirmation`)) {
          const msg = l.validation?.confirmed ? l.validation.confirmed() : `${field} tidak sama dengan konfirmasi`;
          addError(errors, field, msg);
        }
        break

      case "same":
        if (value !== getNestedValue(data, param!)) {
          const msg = l.validation?.same ? l.validation.same({ other: param }) : `${field} harus sama dengan ${param}`;
          addError(errors, field, msg);
        }
        break

      case "different":
        if (value === getNestedValue(data, param!)) {
          const msg = l.validation?.different ? l.validation.different({ other: param }) : `${field} harus berbeda dengan ${param}`;
          addError(errors, field, msg);
        }
        break

      // === REGEX ===
      case "regex":
        if (!value) break
        try {
          const pattern = new RegExp(param!)
          if (!pattern.test(String(value))) {
            const msg = l.validation?.regex ? l.validation.regex() : `${field} tidak sesuai format`;
            addError(errors, field, msg);
          }
        } catch {
          addError(errors, field, `Regex rule untuk ${field} tidak valid`);
        }
        break

      // === DATABASE VALIDATION ===
      case "unique": {
        if (!value) break
        const [table, column, exceptId] = param!.split(",")
        const query = db.table(table).where(column, value)
        if (exceptId) query.whereNot("id", exceptId)

        if (await db.schema.hasColumn(table, "deleted_at")) {
          query.whereNull("deleted_at")
        }

        const existing = await query.first()
        if (existing) {
          const msg = l.validation?.unique ? l.validation.unique() : `${field} sudah digunakan`;
          addError(errors, field, msg);
        }
        break
      }

      case "exists": {
        if (!value) break
        const [table, column] = param!.split(",")
        const query = db.table(table).where(column, value)

        if (await db.schema.hasColumn(table, "deleted_at")) {
          query.whereNull("deleted_at")
        }

        const existing = await query.first()
        if (!existing) {
          const msg = l.validation?.exists ? l.validation.exists({ table }) : `${field} tidak ditemukan di ${table}`;
          addError(errors, field, msg);
        }
        break
      }
    }
  }
}



async function nestedValidation({ value, segments, rules, fieldPath, data, errors }: {
  value      :  any
  segments   :  string[]
  rules      :  ValidationRule[]
  fieldPath  :  string
  data       :  any
  errors     :  Record<string, string[]>
}) {
  if (segments.length === 0) {
    await checkRules({ field: fieldPath, value, rules, data, errors })

    return
  }

  const [segment, ...rest] = segments

  if (segment === "*") {
    if (!Array.isArray(value)) {
      addError(errors, fieldPath, `${fieldPath} harus berupa array`)

      return
    }

    for (let i = 0; i < value.length; i++) {
      await nestedValidation({ value: value[i], segments: rest, rules, fieldPath: `${fieldPath}.${i}`, data, errors })
    }
  } else {
    await nestedValidation({ value: value?.[segment], segments: rest, rules, fieldPath: fieldPath ? `${fieldPath}.${segment}` : segment, data, errors})
  }
}



// ==================================>
// ## Validation helpers
// ==================================>
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined

  const normalizedPath = path
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\["([^"]+)"\]/g, '.$1')

  return normalizedPath.split('.').reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) return acc[key]

    return undefined
  }, obj)
}

function normalizeRules(rules: ValidationRule[] | string): ValidationRule[] {
  if (Array.isArray(rules)) return rules

  return rules.split("|") as ValidationRule[]
}

function addError(errors: Record<string, string[]>, field: string, message: string) {
  errors[field] = [...(errors[field] || []), message]
}
