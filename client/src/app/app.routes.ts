import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { WatchComponent } from './components/watch/watch.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'watch/:id', component: WatchComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: '' }
];