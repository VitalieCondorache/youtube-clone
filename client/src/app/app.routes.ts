import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { MyVideosComponent } from './components/my-videos/my-videos.component';
import { RegisterComponent } from './components/register/register.component';
import { UploadComponent } from './components/upload/upload.component';
import { WatchComponent } from './components/watch/watch.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'watch/:id', component: WatchComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'upload', component: UploadComponent, canActivate: [authGuard] },
  { path: 'my-videos', component: MyVideosComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];