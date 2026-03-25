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
        _id: 'hospital-1',
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

    const exec = vi.fn().mockResolvedValue(hospitals);
    const queryChain: any = {
      // used by APIFeatures.filter()
      find: vi.fn().mockReturnThis(),
      // used by APIFeatures.sort()/paginate()
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      // used by APIFeatures.limitFields() and our explicit select()
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      // used by countFeatures.query.getFilter()
      getFilter: vi.fn().mockReturnValue({}),
      // used by await features.query.exec()
      exec,
    };
    const findSpy = vi.spyOn(Hospital, 'find').mockReturnValue(queryChain);
    vi.spyOn(Hospital, 'countDocuments').mockReturnValue({
      exec: vi.fn().mockResolvedValue(1),
    } as any);

    const service = new HospitalService();
    const result = await service.getAllHospitals({});

    expect(findSpy).toHaveBeenCalledWith();
    expect(queryChain.select).toHaveBeenCalledWith('-__v -createdAt -updatedAt');
    expect(exec).toHaveBeenCalledOnce();
    expect(result.hospitals).toEqual(hospitals);
    expect(result.pagination.currentPage).toBe(1);
  });

  it('returns an empty list when no hospitals exist', async () => {
    const exec = vi.fn().mockResolvedValue([]);
    const queryChain: any = {
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      getFilter: vi.fn().mockReturnValue({}),
      exec,
    };

    vi.spyOn(Hospital, 'find').mockReturnValue(queryChain);
    vi.spyOn(Hospital, 'countDocuments').mockReturnValue({
      exec: vi.fn().mockResolvedValue(0),
    } as any);

    // countDocuments should be called for totalResults
    vi.spyOn(Hospital, 'countDocuments').mockReturnValue({
      exec: vi.fn().mockResolvedValue(0),
    } as any);
    const service = new HospitalService();
    const result = await service.getAllHospitals({});

    expect(result.hospitals).toEqual([]);
  });
});

describe('HospitalService.createHospital', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a hospital and returns it without internal fields', async () => {
    const payload = {
      name: 'api created hospital',
      type: HospitalType.HEALTH_CENTER,
      address: {
        province: 'kigali',
        district: 'gasabo',
        sector: 'kimironko',
        cell: 'kibagabaga',
        village: 'nyarutarama',
      },
    };

    const created = { _id: 'hospital-1' } as any;
    const savedFromDb = {
      _id: 'hospital-1',
      name: 'api created hospital',
      type: HospitalType.HEALTH_CENTER,
      address: payload.address,
    };

    vi.spyOn(Hospital, 'create').mockResolvedValue(created as any);

    const lean = vi.fn().mockResolvedValue(savedFromDb);
    const select = vi.fn().mockReturnValue({ lean } as any);
    const findByIdSpy = vi
      .spyOn(Hospital, 'findById')
      .mockReturnValue({ select } as any);

    const service = new HospitalService();
    const result = await service.createHospital(payload as any);

    expect(findByIdSpy).toHaveBeenCalledWith('hospital-1');
    expect(select).toHaveBeenCalledWith('-__v -createdAt -updatedAt');
    expect(lean).toHaveBeenCalledOnce();
    expect(result).toEqual(savedFromDb);
  });

  it('throws when the created hospital cannot be re-fetched', async () => {
    const payload = {
      name: 'api created hospital 2',
      type: HospitalType.HEALTH_CENTER,
      address: {
        province: 'kigali',
        district: 'gasabo',
        sector: 'kimironko',
        cell: 'kibagabaga',
        village: 'nyarutarama',
      },
    };

    const created = { _id: 'hospital-2' } as any;
    vi.spyOn(Hospital, 'create').mockResolvedValue(created as any);

    const lean = vi.fn().mockResolvedValue(null);
    const select = vi.fn().mockReturnValue({ lean } as any);
    vi.spyOn(Hospital, 'findById').mockReturnValue({ select } as any);

    const service = new HospitalService();

    await expect(service.createHospital(payload as any)).rejects.toThrow('failed_to_create_hospital');
  });
});