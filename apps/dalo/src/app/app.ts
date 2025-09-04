import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChatTest } from './pages/chat-test/chat-test';

@Component({
  imports: [RouterModule, ChatTest],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'dalo';
}
