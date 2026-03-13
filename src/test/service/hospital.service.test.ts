import { afterEach, describe, expect, it, vi } from 'vitest';

import Hospital from '../../models/hospital.model.js';
import { HospitalService } from '../../service/hospital.service.js';
import { HospitalType } from '../../types/hospital.types.js';

describe('HospitalService.getAllHospitals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns hospitals and excludes internal fields from projection', async () => {
    const hospitals = [
      {
        id: 'hospital-1',
        name: 'Nyiranuma Health Center',
        type: HospitalType.HEALTH_CENTER,
        address: {
          province: 'kigali',
          district: 'gasabo',
          sector: 'kimironko',
          cell: 'kibagabaga',
          village: 'nyarutarama',
        },
      },
    ];

    const lean = vi.fn().mockResolvedValue(hospitals);
    const select = vi.fn().mockReturnValue({ lean });
    const findSpy = vi.spyOn(Hospital, 'find').mockReturnValue({ select } as any);

    const service = new HospitalService();
    const result = await service.getAllHospitals();

    expect(findSpy).toHaveBeenCalledWith();
    expect(select).toHaveBeenCalledWith('-__v -createdAt -updatedAt');
    expect(lean).toHaveBeenCalledOnce();
    expect(result).toEqual(hospitals);
  });

  it('returns an empty list when no hospitals exist', async () => {
    const lean = vi.fn().mockResolvedValue([]);
    const select = vi.fn().mockReturnValue({ lean });

    vi.spyOn(Hospital, 'find').mockReturnValue({ select } as any);

    const service = new HospitalService();
    const result = await service.getAllHospitals();

    expect(result).toEqual([]);
  });
});