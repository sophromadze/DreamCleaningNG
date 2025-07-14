import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-office-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './office-cleaning.component.html',
  styleUrl: './office-cleaning.component.scss'
})
export class OfficeCleaningComponent {
  constructor() {}
} 