import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-residential-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './residential-cleaning.component.html',
  styleUrl: './residential-cleaning.component.scss'
})
export class ResidentialCleaningComponent {
  constructor() {}
} 