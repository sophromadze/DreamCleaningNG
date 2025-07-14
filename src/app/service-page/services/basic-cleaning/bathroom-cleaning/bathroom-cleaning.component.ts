import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bathroom-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bathroom-cleaning.component.html',
  styleUrl: './bathroom-cleaning.component.scss'
})
export class BathroomCleaningComponent {
  constructor() {}
} 