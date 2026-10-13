import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { ChevronDown, Check } from 'lucide-react';
import useOutsideClick from '../hooks/use-outside-click';

interface DropdownItem {
  id: string;
  name: string;
  value?: string | number;
}

interface DropdownProps {
  id: string;
  title?: string;
  data: DropdownItem[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  style?: string;
  selectedId?: string;
  onSelect?: (id: string, name: string, value: string) => void;
}

const Dropdown = ({
  id,
  title = 'Select',
  data,
  position = 'bottom-left',
  style,
  selectedId,
  onSelect,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<DropdownItem | undefined>(
    selectedId ? data?.find((item) => item.id === selectedId) : undefined
  );

  const handleChange = (item: DropdownItem) => {
    setSelectedItem(item);
    onSelect && onSelect(item.id, item.name, item.value?.toString() || '');
    setIsOpen(false);
  };

  useEffect(() => {
    if (selectedId && data) {
      const newSelectedItem = data.find((item) => item.id === selectedId);
      newSelectedItem && setSelectedItem(newSelectedItem);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, data]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick({
    ref: dropdownRef,
    handler: () => setIsOpen(false),
  });

  const dropdownClass = classNames(
    'dropdown-scrollbar absolute bg-white min-w-[170px] w-max max-h-52 overflow-y-auto py-3 rounded-lg shadow-[0px_1px_10px_4px_rgba(23,48,31,0.08)] ring ring-gca-border z-10 text-[14px] text-gca-dark',
    {
      'top-full right-0 mt-2': position === 'bottom-right',
      'top-full left-0 mt-2': position === 'bottom-left',
      'bottom-full right-0 mb-2': position === 'top-right',
      'bottom-full left-0 mb-2': position === 'top-left',
    }
  );

  return (
    <div ref={dropdownRef} className='relative'>
      <button
        id={id}
        aria-label='Toggle dropdown'
        aria-haspopup='true'
        aria-expanded={isOpen}
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'flex items-center justify-between gap-2 cursor-pointer',
          style
        )}
      >
        <span className='overflow-hidden whitespace-nowrap flex-1 text-left'>{selectedItem?.name || title}</span>
        {/* <span className='overflow-hidden whitespace-nowrap flex-1 text-left'>{title}</span> */}
        <ChevronDown
          size={18}
          className={classNames('transform duration-500 ease-in-out', {
            'rotate-180': isOpen,
          })}
        />
      </button>

      {/* Open */}
      {isOpen && (
        <div aria-label='Dropdown menu' className={dropdownClass}>
          <ul
            role='menu'
            aria-labelledby={id}
            aria-orientation='vertical'
            className='leading-10 px-2'
          >
            {data?.map((item) => (
              <li
                key={item.id}
                onClick={() => handleChange(item)}
                className={classNames(
                  'flex items-center cursor-pointer hover:bg-gca-badge-bg rounded-lg px-3',
                  { 'bg-gca-badge-bg': selectedItem?.id === item.id }
                )}
              >
                <span>{item.name}</span>
                {selectedItem?.id === item.id && (
                  <Check size={16} className='ml-auto text-gca-green' />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown;