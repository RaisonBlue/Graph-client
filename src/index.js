import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import ApolloClient from 'apollo-client'
import { hmacfetch } from '@nutshelllab/aws4-signer'

const cache = new InMemoryCache()

export const graphQLClient = (uri, headers) => {
  const link = new HttpLink({ uri, headers, fetch: hmacfetch })
  return new ApolloClient({
    link,
    cache
  })
}

export const graphQLRequest = async (uri, request, variables = {}, headers = {}) => {
  if (!request.definitions || request.definitions.length < 1)
    throw new Error(
      `[Apollo Error](${uri}) - GraphQL request does not contain any operation`
    )
  const operation = request.definitions[0].operation
  const graphqlClient = await graphQLClient(uri, headers)
  let result = null

  if (operation === 'query')
    result = graphqlClient.query({
      
      query: request,
      variables,
      fetchPolicy: 'network-only'
    })
  else if (operation === 'mutation')
    result = graphqlClient.mutate({
      mutation: request,
      variables,
      fetchPolicy: 'no-cache'
    })
  else
    throw new Error(`[Apollo Error](${uri}) - Operation ${operation} unhandled`)

  const { data } = await result.catch(e => {
    const { networkError } = e
    if (
      networkError &&
      networkError.result &&
      networkError.result.errors &&
      networkError.result.errors.length > 0
    )
      throw new Error(
        `[Apollo Error](${uri}) - ${networkError.result.errors[0].message}`
      )
    else if (
      networkError &&
      networkError.result &&
      !!networkError.result.message
    )
      throw new Error(`[Apollo Error](${uri}) - ${networkError.result.message}`)
    throw e
  })
  const key = Object.keys(data)[0]
  return data[key]
}
