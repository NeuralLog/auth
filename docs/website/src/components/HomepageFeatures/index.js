import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Fine-grained Authorization',
    Svg: require('@site/static/img/undraw_security.svg').default,
    description: (
      <>
        NeuralLog Auth provides fine-grained authorization using OpenFGA,
        allowing you to control access at the resource level with different
        permission types.
      </>
    ),
  },
  {
    title: 'Multi-tenant Support',
    Svg: require('@site/static/img/undraw_building_blocks.svg').default,
    description: (
      <>
        Built from the ground up for multi-tenancy, NeuralLog Auth ensures
        secure isolation between tenants with proper namespacing and efficient
        resource usage.
      </>
    ),
  },
  {
    title: 'Easy Integration',
    Svg: require('@site/static/img/undraw_connected.svg').default,
    description: (
      <>
        Client SDKs for different platforms make it easy to integrate NeuralLog Auth
        with your applications, whether they're web, server, or mobile.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
