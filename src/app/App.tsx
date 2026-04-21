import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SplitItProvider } from './features/splitit/context';

export default function App() {
  return (
    <SplitItProvider>
      <RouterProvider router={router} />
    </SplitItProvider>
  );
}
