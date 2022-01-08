
import { gql, request } from "./node_modules/graphql-request";

async function main() {
  const endpoint = "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql";

  const query = gql`
    query StopID ($name: String!){
        stops(name: $name) {
         gtfsId
      }
    }
  `

  const variables = {
    name: 'H1622',
  }

  const data = await request(endpoint, query, variables)
  console.log(JSON.stringify(data, undefined, 2))
}

main().catch((error) => console.error(error))