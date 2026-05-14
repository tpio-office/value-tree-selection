import { TreeNode } from '../models/tree-node';

export const sampleTreeData: TreeNode = {
  id: '1',
  name: 'Company Root',
  children: [
    {
      id: '2',
      name: 'Engineering',
      children: [
        {
          id: '5',
          name: 'Frontend Team',
          children: [
            {
              id: '11',
              name: 'UI Developers',
              children: [
                { id: '21', name: 'React Squad' },
                { id: '22', name: 'Angular Squad' }
              ]
            },
            {
              id: '12',
              name: 'UX Designers',
              children: [
                { id: '23', name: 'Design System Team' }
              ]
            }
          ]
        },
        {
          id: '6',
          name: 'Backend Team',
          children: [
            {
              id: '13',
              name: 'API Services',
              children: [
                { id: '24', name: 'REST API Group' },
                { id: '25', name: 'GraphQL Group' }
              ]
            },
            {
              id: '14',
              name: 'Database Team',
              children: [
                { id: '26', name: 'SQL Database' },
                { id: '27', name: 'NoSQL Database' }
              ]
            }
          ]
        },
        {
          id: '7',
          name: 'DevOps',
          children: [
            { id: '15', name: 'Infrastructure' },
            { id: '16', name: 'CI/CD Pipeline' }
          ]
        }
      ]
    },
    {
      id: '3',
      name: 'Marketing',
      children: [
        {
          id: '8',
          name: 'Digital Marketing',
          children: [
            { id: '17', name: 'SEO Team' },
            { id: '18', name: 'Social Media' }
          ]
        },
        {
          id: '9',
          name: 'Brand Strategy',
          children: [
            { id: '19', name: 'Content Creation' },
            { id: '20', name: 'Public Relations' }
          ]
        }
      ]
    },
    {
      id: '4',
      name: 'Sales',
      children: [
        {
          id: '10',
          name: 'Enterprise Sales',
          children: [
            { id: '28', name: 'North America' },
            { id: '29', name: 'Europe' },
            { id: '30', name: 'Asia Pacific' }
          ]
        },
        {
          id: '31',
          name: 'SMB Sales',
          children: [
            { id: '32', name: 'Online Channel' },
            { id: '33', name: 'Retail Partners' }
          ]
        }
      ]
    }
  ]
};