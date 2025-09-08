import { Route } from '@angular/router';
import { ChatTest } from './pages/chat-test/chat-test';

export const appRoutes: Route[] = [
  {
    path: '',
    children: [
      { path: '', component: ChatTest },
      { path: ':chatId', component: ChatTest },
    ],
  },
  { path: '**', redirectTo: '' },
];
