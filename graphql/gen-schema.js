import attributes from './attributes'

import baseSchema from 'raw-loader!./base.schema.graphql'

export const toGraphqlName = name => name.replace(/-|\./g, '_')

const idMap = attributes
  .map(a => a.id)
  .reduce((map, id) => {
    map[toGraphqlName(id)] = id
    return map
  }, {})

export const fromGraphqlName = name => idMap[name] || name

// DDF types -> GraphQL types
const typeMap = {
  STRING: 'String',
  DOUBLE: 'Float',
  FLOAT: 'Float',
  SHORT: 'Int',
  INTEGER: 'Int',
  LONG: 'Int',
  BOOLEAN: 'Boolean',
  BINARY: 'Binary',
  GEOMETRY: 'Geometry',
  XML: 'XML',
  DATE: 'Date',
}

const attrs = attributes
  .map(attr => {
    const { id, multivalued, type } = attr
    const name = toGraphqlName(id)
    let graphQLType = typeMap[type]

    if (!graphQLType) {
      console.warn('Could not find graphql type match for ', type)
    }

    if (multivalued) {
      graphQLType = `[${graphQLType}]`
    }

    return `  # metacard attribute: **\`${id}\`**\n  ${name}: ${graphQLType}`
  })
  .join('\n')

const gen = () => {
  return `
  scalar Json
  # Binary content embedded as a base64 String
  scalar Binary
  # WKT embedded as a String
  scalar Geometry
  # XML embedded as a String
  scalar XML
  # ISO 8601 Data Time embedded as a String
  scalar Date

  # Common and well known metacard attributes intended for progrmatic usage
  type MetacardAttributes {
  ${attrs}
  }

  input MetacardAttributesInput {
  ${attrs}
  }

  ${baseSchema}

  `
}

export const generateSchemaFromMetacardTypes = (
  extendedSchema,
  metacardTypes
) => {
  const attrs = metacardTypes
  const idMap = attrs
    .map(a => a.id)
    .reduce((map, id) => {
      map[toGraphqlName(id)] = id
      return map
    }, {})

  const fromGraphqlName = name => idMap[name] || name

  const customAttrs = attrs
    .map(attr => {
      const { id, multivalued, type } = attr
      const name = toGraphqlName(id)
      let graphQLType = typeMap[type]

      if (!graphQLType) {
        console.warn('Could not find graphql type match for ', type)
      }

      if (multivalued) {
        graphQLType = `[${graphQLType}]`
      }

      return `  # metacard attribute: **\`${id}\`**\n  ${name}: ${graphQLType}`
    })
    .join('\n')

  let schema = `
  scalar Json
  # Binary content embedded as a base64 String
  scalar Binary
  # WKT embedded as a String
  scalar Geometry
  # XML embedded as a String
  scalar XML
  # ISO 8601 Data Time embedded as a String
  scalar Date

  # Common and well known metacard attributes intended for progrmatic usage
  type MetacardAttributes {
  ${customAttrs}
  }

  input MetacardAttributesInput {
  ${customAttrs}
  }

  ${baseSchema}
  `

  if (extendedSchema) {
    schema = `
      ${schema}

      ${extendedSchema}
    `
  }

  window.logSchema = () => {
    console.log(schema)
  }

  return {
    definitions: schema,
    toGraphqlName,
    fromGraphqlName,
  }
}

export default gen
