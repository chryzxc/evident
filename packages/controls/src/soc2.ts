import type { ControlMapping } from '@evident/types';

export interface FrameworkControl {
  id: string;
  title: string;
  mappings: ControlMapping[];
}

export const SOC2_CONTROLS: FrameworkControl[] = [
  {
    id: 'CC7.2',
    title: 'System monitoring',
    mappings: [
      {
        framework: 'soc2',
        controlId: 'CC7.2',
        controlTitle: 'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity\'s ability to meet service commitments and system requirements.',
        relationship: 'SUPPORTS',
        strength: 'MODERATE',
        explanation: 'CI/CD workflows with build and test steps demonstrate systematic monitoring of code changes.',
        limitations: ['Requires review of monitoring tools outside CI/CD.'],
        technicalCoverageOnly: true,
      },
    ],
  },
  {
    id: 'CC7.4',
    title: 'Incident response',
    mappings: [
      {
        framework: 'soc2',
        controlId: 'CC7.4',
        controlTitle: 'The entity responds to identified security incidents by executing a defined incident response program.',
        relationship: 'PARTIALLY_SUPPORTS',
        strength: 'WEAK',
        explanation: 'SECURITY.md presence suggests an incident response and vulnerability disclosure pathway exists.',
        limitations: [
          'Does not confirm an actual incident response program.',
          'Requires manual review of incident response procedures.',
          'Requires review of past incident records.',
        ],
        technicalCoverageOnly: true,
      },
    ],
  },
  {
    id: 'CC8.1',
    title: 'Change management',
    mappings: [
      {
        framework: 'soc2',
        controlId: 'CC8.1',
        controlTitle: 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its security objectives.',
        relationship: 'SUPPORTS',
        strength: 'STRONG',
        explanation: 'PR workflows (build, lint, test checks in CI) demonstrate systematic change management controls.',
        limitations: ['Does not verify authorization or approval processes.'],
        technicalCoverageOnly: true,
      },
    ],
  },
  {
    id: 'PI1.4',
    title: 'Logical access',
    mappings: [
      {
        framework: 'soc2',
        controlId: 'PI1.4',
        controlTitle: 'The entity restricts the storage of, access to, and disposal of personal information and other sensitive assets.',
        relationship: 'SUPPORTS',
        strength: 'MODERATE',
        explanation: 'Secret scanning in CI and no hardcoded credentials detected indicate protections around sensitive asset storage.',
        limitations: [
          'Does not cover database-level access controls.',
          'Requires manual review of data storage and disposal policies.',
        ],
        technicalCoverageOnly: true,
      },
    ],
  },
  {
    id: 'CC6.2',
    title: 'Access control',
    mappings: [
      {
        framework: 'soc2',
        controlId: 'CC6.2',
        controlTitle: 'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.',
        relationship: 'PARTIALLY_SUPPORTS',
        strength: 'WEAK',
        explanation: 'Authentication middleware detected on protected routes indicates access control mechanisms are in place.',
        limitations: [
          'Does not verify user registration or authorization workflows.',
          'Requires manual review of access provisioning processes.',
        ],
        technicalCoverageOnly: true,
      },
    ],
  },
];
