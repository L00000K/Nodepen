import React from 'react'
import nookies from 'nookies'
import { NextPage, GetServerSideProps } from 'next'
import { UserProfile } from '@/features/user-profile'
import getConfig from 'next/config'
import { ApolloClient, createHttpLink, gql, InMemoryCache } from '@apollo/client'
import { useSessionManager } from '@/features/common/context/session'
import { ApolloContext } from '@/features/common/context/apollo'

type UserProfilePageProps = {
  username: string
  photoUrl?: string
}

const UserProfilePage: NextPage<UserProfilePageProps> = (user) => {
  const { token } = useSessionManager()

  return (
    <ApolloContext token={token}>
      <UserProfile username={user.username} photoUrl={user.photoUrl} />
    </ApolloContext>
  )
}

const { publicRuntimeConfig } = getConfig()

export const getServerSideProps: GetServerSideProps<UserProfilePageProps> = async (context) => {
  try {
    const { user: username } = context.query

    const cookie = nookies.get(context)

    const client = new ApolloClient({
      ssrMode: true,
      link: createHttpLink({
        uri: publicRuntimeConfig?.apiEndpoint ?? 'http://localhost:4000/graphql',
        credentials: 'same-origin',
        headers: {
          authorization: cookie.token,
        },
      }),
      cache: new InMemoryCache(),
    })

    const { data, error } = await client.query({
      query: gql`
        query GetPublicUser($username: String!) {
          publicUserByUsername(username: $username) {
            username
            photoUrl
          }
        }
      `,
      variables: {
        username,
      },
    })

    if (!data || !data.publicUserByUsername || !!error) {
      return { notFound: true }
    }

    const user = data.publicUserByUsername

    return { props: user }
  } catch {
    return { notFound: true }
  }
}

export default UserProfilePage
