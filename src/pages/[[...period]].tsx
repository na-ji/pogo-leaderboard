import Head from 'next/head';
import type { NextPage } from 'next';
import useSWR from 'swr';
import { useIntl } from 'react-intl';
import { GetStaticPaths, GetStaticPathsResult } from 'next';

import { OverallLeaderboards } from '@/features/leaderboard';
import { Trainer } from '@/types';
import { SupportedLocale, wrapStaticPropsWithLocale } from '@/utils/i18n';
import type { PeriodLeaderboard } from '@/features/leaderboard/api';

interface HomeProps {
  initialTrainers: Trainer[];
  period: keyof PeriodLeaderboard | null;
}

enum Paths {
  'day' = 'lastDay',
  'week' = 'lastWeek',
  'month' = 'lastMonth',
}

const paths = Object.keys(Paths).concat('');

const Home: NextPage<HomeProps> = ({ initialTrainers, period }) => {
  const intl = useIntl();
  const description = intl.formatMessage({
    defaultMessage: 'Pokémon Go Leaderboard',
    id: 'app.description',
    description: 'Index page meta description',
  });
  const title = intl.formatMessage({
    defaultMessage: 'Leaderboard',
    id: 'index.title',
    description: 'Index page title',
  });
  const { data: trainers } = useSWR<Trainer[]>(`/api/leaderboard${period ? '/' + period : ''}`, {
    fallbackData: initialTrainers,
  });

  return (
    <>
      <Head>
        <title key="title">{title}</title>
        <meta key="description" name="description" content={description} />
        <link
          key="preload"
          rel="preload"
          href={`/api/leaderboard${period ? '/' + period : ''}`}
          as="fetch"
          crossOrigin="anonymous"
        />
      </Head>
      <h1 className="title-1 mt-2.5 lg:mt-0.5 mb-4 lg:mb-7.5">{title}</h1>
      {Array.isArray(trainers) && <OverallLeaderboards trainers={trainers} />}
    </>
  );
};

export const getStaticProps = wrapStaticPropsWithLocale<HomeProps, { period?: ['day'] | ['week'] | ['month'] }>(
  async ({ params }) => {
    let trainers,
      period = null;

    if (params && Array.isArray(params?.period) && paths.includes(params?.period[0])) {
      const { getPeriodTrainers } = await import('@/features/leaderboard/api');
      period = Paths[params.period[0]];
      trainers = await getPeriodTrainers(period);
    } else {
      const { getOverallLeaderboard } = await import('@/features/leaderboard/api');
      trainers = await getOverallLeaderboard();
    }

    return {
      props: { initialTrainers: trainers, period },
      // rebuild at most every 30 minutes
      revalidate: 1800,
    };
  },
);

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: paths.reduce<GetStaticPathsResult['paths']>((paths, path) => {
      Object.values(SupportedLocale).forEach((locale) => {
        paths.push({ params: { period: path === '' ? [] : [path] }, locale });
      });

      return paths;
    }, []),
    fallback: false,
  };
};

export default Home;