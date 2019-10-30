import { ApolloClient } from 'apollo-client'
import { SchemaLink } from 'apollo-link-schema'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { makeExecutableSchema } from 'graphql-tools'
import { createTransport } from './transport'

import fetch from './fetch'

const ROOT = '/search/catalog/internal'

import { generateSchemaFromMetacardTypes } from './gen-schema'

const getBuildInfo = () => {
  /* eslint-disable */
  const commitHash = __COMMIT_HASH__
  const isDirty = __IS_DIRTY__
  const commitDate = __COMMIT_DATE__
  /* eslint-enable */

  return {
    commitHash,
    isDirty,
    commitDate,
    identifier: `${commitHash.trim()}${isDirty ? ' with Changes' : ''}`,
    releaseDate: commitDate,
  }
}

const systemProperties = async () => {
  const [configProperties, configUiProperties] = await Promise.all([
    (await fetch(`${ROOT}/config`)).json(),
    (await fetch(`${ROOT}/platform/config/ui`)).json(),
  ])
  return {
    ...configProperties,
    ...configUiProperties,
    ...getBuildInfo(),
  }
}

const { send } = createTransport({
  pathname: ROOT,
})

const renameKeys = (f, map) => {
  return Object.keys(map).reduce((attrs, attr) => {
    const name = f(attr)
    attrs[name] = map[attr]
    return attrs
  }, {})
}

const metacards = mappers => async (ctx, args) => {
  console.log('Called metacards')
  const q = { ...args.settings, filterTree: args.filterTree }
  const req = send(q)
  const json = await req.json()

  debugger

  const attributes = json.results.map(result =>
    mappers.toGraphqlMap(result.metacard.properties)
  )

  return { attributes, ...json }
}

const queryTemplates = {
  accessAdministrators: 'security_access_administrators',
  accessGroups: 'security_access_groups',
  accessGroupsRead: 'security_access_groups_read',
  accessIndividuals: 'security_access_individuals',
  accessIndividualsRead: 'security_access_individuals_read',
  created: 'created',
  filterTemplate: 'filter_template',
  modified: 'modified',
  owner: 'metacard_owner',
  querySettings: 'query_settings',
  id: 'id',
  title: 'title',
}

const fetchQueryTemplates = async () => {
  const res = await fetch(`${ROOT}/forms/query`)
  const json = await res.json()
  const attributes = json
    .map(attrs => renameKeys(k => queryTemplates[k], attrs))
    .map(({ modified, created, ...rest }) => {
      return {
        ...rest,
        created: new Date(created).toISOString(),
        modified: new Date(modified).toISOString(),
      }
    })
  const status = {
    // count: Int
    // elapsed: Int
    // hits: Int
    // id: ID
    // successful: Boolean
    count: attributes.length,
    successful: true,
    hits: attributes.length,
  }
  return { attributes, status }
}

const metacardsByTag = mappers => async (ctx, args) => {
  if (args.tag === 'query-template') {
    return fetchQueryTemplates()
  }

  console.log('Called metacardsByTag')

  return metacards(mappers)(ctx, {
    filterTree: {
      type: '=',
      property: 'metacard-tags',
      value: args.tag,
    },
    settings: args.settings,
  })
}

const metacardById = async (ctx, args) => {
  return metacards(ctx, {
    filterTree: {
      type: 'AND',
      filters: [
        {
          type: '=',
          property: 'id',
          value: args.id,
        },
        {
          type: 'LIKE',
          property: 'metacard-tags',
          value: '%',
        },
      ],
    },
    settings: args.settings,
  })
}

const user = async () => {
  const res = await fetch(`${ROOT}/user`)
  return res.json()
}

const sources = async () => {
  const res = await fetch(`${ROOT}/catalog/sources`)
  return res.json()
}

const metacardTypes = async () => {
  const res = await fetch(`${ROOT}/metacardtype`)
  const json = await res.json()

  const types = Object.keys(json).reduce((types, group) => {
    return Object.assign(types, json[group])
  }, {})

  return Object.keys(types).map(k => types[k])
}

const Query = mappers => ({
  metacards: metacards(mappers),
  metacardsByTag: metacardsByTag(mappers),
  user,
  sources,
  metacardById,
  systemProperties,
  metacardTypes,
})

const createMetacard = mappers => async (parent, args) => {
  const { attrs } = args

  const body = {
    geometry: null,
    type: 'Feature',
    properties: mappers.fromGraphqlMap(attrs),
  }

  const res = await fetch(`${ROOT}/catalog/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(res.statusText)
  }

  const id = res.headers.get('id')
  const created = new Date().toISOString()
  const modified = created

  const mapToReturn = mappers.toGraphqlMap({
    ...attrs,
    id,
    created: created,
    'metacard.created': created,
    modified: modified,
    'metacard.modified': modified,
    'metacard.owner': body.properties['metacard.owner'] || 'You',
  })

  console.log('Returning ', mapToReturn)
  return mapToReturn
}

const saveMetacard = mappers => async (parent, args) => {
  const { id, attrs } = args

  const attributes = Object.keys(attrs).map(attribute => {
    const value = attrs[attribute]
    return {
      attribute: mappers.fromGraphqlName(attribute),
      values: Array.isArray(value) ? value : [value],
    }
  })

  const body = [
    {
      ids: [id],
      attributes,
    },
  ]

  const res = await fetch(`${ROOT}/metacards`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(res.statusText)
  }

  const modified = new Date().toISOString()
  return mappers.toGraphqlMap({
    __typename: 'MetacardAttributes',
    id,
    'metacard.modified': modified,
    ...attrs,
  })
}

const deleteMetacard = async (parent, args) => {
  const { id } = args

  const res = await fetch(`${ROOT}/catalog/${id}`, {
    method: 'DELETE',
  })

  if (res.ok) {
    return id
  }
}

const Mutation = mappers => ({
  createMetacard: createMetacard(mappers),
  saveMetacard: saveMetacard(mappers),
  createMetacardFromJson: createMetacard(mappers),
  saveMetacardFromJson: saveMetacard(mappers),
  deleteMetacard,
})

const resolvers = mappers => ({
  Query: Query(mappers),
  Mutation: Mutation(mappers),
})

const cache = new InMemoryCache()

export const createClient = async extendedSchema => {
  const types = await metacardTypes()
  console.log('Metacard Types: ', types)
  const schema = generateSchemaFromMetacardTypes(extendedSchema, types)

  const toGraphqlMap = map => {
    return Object.keys(map).reduce((attrs, attr) => {
      const name = schema.toGraphqlName(attr)
      attrs[name] = map[attr]
      return attrs
    }, {})
  }

  const fromGraphqlMap = map => {
    return Object.keys(map).reduce((attrs, attr) => {
      const name = schema.fromGraphqlName(attr)
      attrs[name] = map[attr]
      return attrs
    }, {})
  }

  const mappers = {
    fromGraphqlMap,
    toGraphqlMap,
  }

  const executableSchema = makeExecutableSchema({
    typeDefs: schema.definitions,
    resolvers: resolvers(mappers),
  })

  return new ApolloClient({
    link: new SchemaLink({ schema: executableSchema }),
    cache,
  })
}
