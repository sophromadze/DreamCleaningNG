import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-custom-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './custom-cleaning.component.html',
  styleUrl: './custom-cleaning.component.scss'
})
export class CustomCleaningComponent {
  constructor() {}
} 