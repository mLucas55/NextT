import { writeFileSync } from 'fs';

/**
 * @type {{paths: { [key: string]: import("./openAPI").Path; }; components: { schemas: { [key: string]: import("./openAPI").Schema; };  responses: { [key: string]: import("./openAPI").Schema }}}}
 */
const spec = await (await fetch("https://api-v3.mbta.com/docs/swagger/swagger.json")).json();

/**
 * @param {string} str
 * @param {boolean} [multiline]
 */
function stringToComment(str, multiline) {
  let ret = ("/**" + (multiline ? "\n * " : " ") + str.replaceAll('@', '\\@').replaceAll('*/', '*\\/').replaceAll('\n', multiline ? '\n * ' : ' ') + (multiline ? '\n */' : " */")).replaceAll('* \n */', '*/');
  let match;
  while ((match = /\[(?<name>.+)\]\(#.+\)/gm.exec(ret)) !== null) {
    const exp = match[0];
    const name = match.groups.name;
    ret = ret.replaceAll(exp, `{@link ${name}}`);
  }
  return ret;
}

/**
 * @param {string} str 
 */
function correctCase(str) {
  for (var i = 0; i < str.length; i++) {
    if (str.charAt(i) == '_') {
      str = str.substring(0, i) + str.charAt(i + 1).toUpperCase() + str.substring(i + 1 + 1);
    }
  }
  return str;
}

function jsType(type) {
  if (type == "integer") {
    return "number";
  } else {
    return type;
  }
}

/**
 * @param {string} ref 
 * @returns 
 */
function refName(ref) {
  const path = ref.split("/");
  return path[path.length - 1]
}

/**
 * @param {string} ref 
 * @returns {import("./openAPI").Schema}
 */
function reference(ref) {
  const path = ref.split("/");
  var p;
  for (const part of path) {
    if (part == "#") {
      p = spec;
    } else {
      p = p[part];
    }
  }
  return p;
}

/**
 * 
 * @param {string[]} arr 
 * @param {boolean} parenthesis 
 * @returns 
 */
function union(arr, parenthesis = false) {
  const unique = [];
  for (const type of arr)
    if (!unique.includes(type))
      unique.push(type);
  const union = unique.join("|");
  return parenthesis && unique.length > 1 ? `(${union})` : union;
}

/**
 * 
 * @param {string} key 
 * @param {import("./openAPI").Schema} schema 
 * @returns 
 */
function property(key, schema, optional = false, multiline = false) {
  return `${keyify(correctCase(key))}${optional ? "?" : ""}:${schemaToTypescript(schema, multiline)}`;
}

/**
 * @param {string} key 
 */
function keyify(key) {
  return (!key.startsWith("[") || !key.endsWith("]")) && key.match(/[\[\](){}\?\-"'`\\;:/\\,]/) ? JSON.stringify(key) : key;
}

/**
 * @param {import("./openAPI").Schema} schema 
 */
function flattenSchema(schema) {
  schema = { ...schema };
  if (schema.oneOf)
    schema.oneOf = schema.oneOf.filter(s => !schema.oneOf.some(other => other.allOf?.some(o => schemaToTypescript(s) === schemaToTypescript(o)))).flatMap(schema => schema.oneOf || schema.anyOf || schema);
  if (schema.anyOf)
    schema.anyOf = schema.anyOf.filter(s => !schema.anyOf.some(other => other.allOf?.some(o => schemaToTypescript(s) === schemaToTypescript(o)))).flatMap(schema => schema.oneOf || schema.anyOf || schema);
  return schema;
}

/**
 * @param {import("./openAPI").Schema} schema 
 */
function schemaToTypescript(schema, multiline = false, parenthesis = false) {
  schema = flattenSchema(schema);
  const type = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (schema.$ref)
    return refName(schema.$ref);
  if (schema.oneOf)
    if (type.length === 0)
      return union(schema.oneOf.map(schema => schemaToTypescript(schema, multiline)), parenthesis);
    else
      return "";
  if (schema.anyOf)
    return union(schema.anyOf.map(schema => schemaToTypescript(schema, multiline)), parenthesis);
  if (schema.allOf)
    if (schema.enum)
      return union(schema.enum.map((val) => `${refName(schema.allOf[0].$ref)}.${reference(schema.allOf[0].$ref).oneOf.find(s => s.const == val).title}`), parenthesis);
    else
      return schema.allOf.map((schema, _i, arr) => schemaToTypescript(schema, multiline, arr.length > 1)).join("&");
  if (schema.contentEncoding === "binary")
    return "ArrayBuffer";
  if (type.length > 0) {
    return union(type.map((t) => {
      if (t === "boolean" || jsType(t) === "number" || t === "string" || t === "null")
        return jsType(t);
      if (t === "array")
        return `${schemaToTypescript(schema.items, multiline, true)}[]`;
      if (t === "object") {
        const parts = ["{"];
        if (schema.properties) {
          for (const [key, value] of Object.entries(schema.properties)) {
            if (value.description)
              parts.push(stringToComment(value.description, multiline));
            parts.push(property(key, value, !schema.required || !schema.required.includes(key), multiline) + ";");
          }
        }
        if (schema.additionalProperties) {
          if (schema.additionalProperties.description)
            parts.push(stringToComment(schema.additionalProperties.description));
          parts.push(property("[key:string]", schema.additionalProperties, false, multiline) + ";");
        }
        parts.push('}');
        return multiline ? parts.join("\n") : parts.join("");
      }
      return "any";
    }), parenthesis);
  }
  if (schema.content)
    return union(Object.entries(schema.content).map(([key, value]) => schemaToTypescript(value.schema, multiline)), parenthesis);
  return "never";
}

/**
 * @param { import("./openAPI").Schema & { oneOf: import("./openAPI").Schema[] } } schema 
 */
function parseEnum(schema) {
  return `{\n${schema.oneOf.map(value => `${value.description ? stringToComment(value.description, true) + '\n' : ""}${value.title.includes("-") ? JSON.stringify(value.title) : value.title} = ${JSON.stringify(value.const)}`).join(",\n")}}`;
}

function writeTypes() {
  var str = 'import { Client } from "./discord";\n';
  const exports = [];
  const components = { ...spec.definitions };
  for (const key in components) {
    const schema = components[key];
    const type = schemaToTypescript(schema, true, true);
    if (schema.description) {
      str += stringToComment(schema.description, true) + '\n';
    }
    if (type !== "") {
      str += type.startsWith("(") || !type.startsWith("{") ? `type ${key} = ${type.startsWith("(") ? type.substring(1, type.length - 1) : type};\n` : `interface ${key} ${type}\n`;
    } else {
      str += `enum ${key} ${parseEnum(schema)}\n`;
    }
    exports.push(key);
  }
  const interfaces = [];
  let client = "class Client {\nconstructor(token: string);\nrequest(path: string): Promise<any>\n";
  for (const path in spec.paths) {
    const obj = spec.paths[path];
    const pathParams = [];
    for (const method in obj) {
      const operation = obj[method];
      if (method == "parameters") {
        pathParams.push(...operation.map((value => property(value.name, value.schema, !value.required))));
        continue;
      }
      const args = [];
      args.push(...pathParams);
      if (operation.requestBody) {
        const schemas = [];
        if (Object.keys(operation.requestBody.content).some(v => !["application/json", "multipart/form-data"].includes(v)))
          console.log(operation.requestBody);
        schemas.push(...Object.values(operation.requestBody.content).map(value => value.schema));
        if (schemas.some((v) => v.type === "object"))
          args.push(property("data", { oneOf: schemas }, !operation.requestBody.required));
        else
          args.push(property("data", { oneOf: schemas }, !operation.requestBody.required));
      }
      let op = correctCase(operation.operationId.replaceAll('.', '_'));
      const match = op.match(/ApiWeb(?<object>.+)Controller(?<operation>Show|Index)/);
      const isIndex = match.groups.operation === "Index";
      const object = match.groups.object;
      op = `get${object}${isIndex ? 's' : ''}`
      const params = [];
      if (operation.parameters) {
        const properties = {};
        const required = [];
        for (const param of operation.parameters) {
          if (param.in === "path")
            params.push(param);
          else {
            properties[param.name] = param;
            if (param.required)
              required.push(param.name);
          }
        }
        for (const param of params) {
          args.push(property(param.name, param, !param.required));
        }
        const optionsName = op + 'Options';
        const options = { name: "options", schema: { type: "object", $ref: `/${optionsName}`, required: required, }, description: "Options"  };
        params.push(options);
        args.push(property("options", options.schema, required.length === 0));
        interfaces.push(`interface ${optionsName} ` + schemaToTypescript({ type: "object", properties }, true, false) + '\n');
        exports.push(optionsName);
      }
      const returnType = [];
      for (const code in operation.responses) {
        if (code.startsWith('2'))
          returnType.push(schemaToTypescript(operation.responses[code].schema).replace("never", "void"));
      }
      let comment = stringToComment(operation.description || "", true);
      comment = comment.substring(0, comment.length - 3);
      for (const param of params) {
        comment += ` * @param ${param.name} ${param.description}\n`
      }
      comment += " */"
      client += `${comment}\nasync ${op}(${args.join(",")}):Promise<${returnType.length === 0 ? "void" : union(returnType)}>`;
      client += `{\nreturn await this.request(${isIndex ? "'" : "`"}/${object.toLowerCase()}s${!isIndex ? "/${encodeURIComponent(id)}" : ""}${isIndex ? "'" : "`"}, {query:options});\n}\n`;
    }
  }
  client += "}\n"
  str += interfaces.join('') + client;
  str += `export {\n${exports.concat("Client").join(',\n')}\n}`;
  writeFileSync("./test.d.ts", str);
}

// function writeScript() {
//   var str = 'import { Client } from "./discord.js";\n';
//   const exports = [];
//   const components = { ...spec.definitions };
//   for (const key in components) {
//     const schema = components[key];
//     if (schemaToTypescript(schema) === "") {
//       str += `const ${key}=${parseEnum_f(schema)};\n`;
//       exports.push(key);
//     }
//   }
//   str += 'class DiscordAPIError extends Error {\nconstructor(error) {\nsuper(error.errors !== undefined ? `${error.message}\\n${[...DiscordAPIError.flattenDiscordError(error.errors)].join("\\n")}` : error.message);\nthis.name = `DiscordAPIError[${error.code}]`;\n}\nstatic *flattenDiscordError(obj, key = "") {\nif (obj.message === "string") {\nreturn yield `${key.length ? `${key}[${obj.code}]` : `${obj.code}`}: ${obj.message}`.trim();\n}\nfor (const [otherKey, val] of Object.entries(obj)) {\nconst nextKey = otherKey.startsWith("_") ? key : key ? Number.isNaN(Number(otherKey)) ? `${key}.${otherKey}` : `${key}[${otherKey}]` : otherKey;\nif (typeof val === "string") {\nyield val;\n} else if ("_errors" in val) {\nfor (const error of val._errors) {\nyield* this.flattenDiscordError(error, nextKey);\n}\n} else {\nyield* this.flattenDiscordError(val, nextKey);\n}\n}\n}}\nclass RestClient {\nconstructor(client) {\nif (!(client instanceof Client))\nthrow new TypeError(`client must be an instance of Client`);\nObject.defineProperty(this, "client", { value: client, enumerable: true })\n}\nasync request(path, options) {\noptions = options || {};options.headers = { ...(options.headers || {}), ...{ Authorization: `Bot ${this.client.token}` } };\nconst res = await fetch(`https://discord.com/api/v10${path}`, options);\nif (!res.ok)\nthrow new DiscordAPIError(await res.json());\nif (res.status === 204)\nreturn null;\nif (res.headers.get("Content-Type") === "application/json")\nreturn await res.json();\nelse\nreturn await res.arrayBuffer();\n}\n';
//   for (let path in spec.paths) {
//     const obj = spec.paths[path];
//     const pathParams = [];
//     for (const method in obj) {
//       const operation = obj[method];
//       if (method == "parameters") {
//         for (const v of operation) {
//           path = path.replaceAll(`{${v.name}}`, correctCase(`\${${v.name}}`));
//         }
//         pathParams.push(...operation.map((value => `${correctCase(value.name)}`)));
//         continue;
//       }
//       const lines = [];
//       let p = path;
//       const options = [];
//       if (method !== "get")
//         options.push(`method:${JSON.stringify(method.toUpperCase())}`);
//       const args = [];
//       if (pathParams.length > 0)
//         args.push(...pathParams);
//       if (operation.requestBody) {
//         let hasBody = false;
//         const contentTypes = Object.keys(operation.requestBody.content).filter(v => ["application/json", "multipart/form-data"].includes(v));
//         if (contentTypes.length === 0) {

//         } else if (contentTypes.length === 1) {
//           args.push("data");
//           const contentType = contentTypes[0];
//           options.push(`headers:{"Content-Type":${JSON.stringify(contentType)}}`);
//           switch (contentTypes[0]) {
//             case "application/json":
//               options.push("body:Buffer.from(JSON.stringify(data))");
//               break;
//             case "multipart/form-data":
//               options.push("body:Buffer.from(\"\")");
//               break;
//           }
//         } else {
//           args.push("data");
//           lines.push('const contentType="application/json";');
//           lines.push('const body=Buffer.from(JSON.stringify(data));');
//           options.push('headers:{"Content-Type":contentType}');
//           options.push("body:body");
//         }
//       }
//       const params = [];
//       if (operation.parameters) {
//         params.push(...operation.parameters.map(v => correctCase(v.name)));
//         args.push("options");
//       }
//       lines.unshift(`async ${correctCase(operation.operationId.replaceAll('.', '_'))}(${args.join(", ")}){`);
//       if (params.length > 0) {
//         lines.push("const params = new URLSearchParams(options || {});");
//         p += '${params.size > 0 ? `?${params.toString()}` : ""}';
//       }
//       lines.push(`return await this.request(${pathParams.length > 0 || params.length > 0 ? `\`${p}\`` : `"${p}"`}${options.length > 0 ? `, {${options.join(",")}}` : ""});`);
//       lines.push("}");
//       str += lines.join("\n") + "\n";
//     }
//   }
//   str += "}\n"
//   str += `export {\n${exports.concat("DiscordAPIError", "RestClient").join(',\n')}\n}`;
//   writeFileSync("./test.js", str);
// }

writeTypes();
// writeScript();